import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { apiError, forbidden, badRequest, notFound } from '@/lib/apiResponse';
import { parseListParams } from '@/lib/apiParams';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import Booking from '@/models/Booking';
import Turf from '@/models/Turf';
import BlockedSlot from '@/models/BlockedSlot';
import User from '@/models/User';
import { escapeRegex } from '@/lib/validation';

export async function GET(request) {
  try {
    const session = await requireAdmin();
    if (!session) return forbidden();

    const { page, limit, skip, searchParams } = parseListParams(request);
    const city = searchParams.get('city') || '';
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const withCounts = searchParams.get('counts') === '1';

    await dbConnect();

    // Base filters shared by the list and the status counts.
    const baseQuery = {};
    if (city) baseQuery.city = { $regex: escapeRegex(city), $options: 'i' };
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      const owners = await User.find({ $or: [{ name: rx }, { email: rx }, { phone: rx }] }).select('_id').lean();
      baseQuery.$or = [{ name: rx }, { owner: { $in: owners.map(u => u._id) } }];
    }

    const query = { ...baseQuery };
    if (status) query.onboardingStatus = status;

    const [venues, total, countsRaw] = await Promise.all([
      Venue.find(query)
        .populate('owner', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Venue.countDocuments(query),
      withCounts
        ? Venue.aggregate([
            { $match: baseQuery },
            { $group: { _id: { $ifNull: ['$onboardingStatus', 'ACTIVE'] }, count: { $sum: 1 } } },
          ])
        : [],
    ]);

    const counts = { ALL: 0 };
    countsRaw.forEach((c) => { counts[c._id] = c.count; counts.ALL += c.count; });

    // Turfs + booking counts for the listed venues.
    const venueIds = venues.map((v) => v._id);
    const [bookingCounts, turfRows] = await Promise.all([
      Booking.aggregate([
        { $match: { venue: { $in: venueIds }, bookingType: { $ne: 'OFFLINE' } } },
        { $group: { _id: '$venue', count: { $sum: 1 } } },
      ]),
      Turf.find({ venue: { $in: venueIds } }).select('venue name order sport').sort({ order: 1 }).lean(),
    ]);
    const countMap = {};
    bookingCounts.forEach((b) => { countMap[b._id.toString()] = b.count; });
    const turfMap = {};
    turfRows.forEach((t) => { (turfMap[t.venue.toString()] ||= []).push(t); });

    return NextResponse.json({
      venues: venues.map((v) => ({
        id: v._id.toString(),
        name: v.name,
        city: v.city,
        area: v.area,
        address: v.address,
        sportTypes: v.sportTypes,
        pricePerHour: v.pricePerHour,
        discountPercent: v.discountPercent || 0,
        numberOfTurfs: v.numberOfTurfs || 1,
        turfs: (turfMap[v._id.toString()] || []).map(t => ({ id: t._id.toString(), name: t.name, order: t.order, sport: t.sport })),
        images: v.images,
        amenities: v.amenities,
        rating: v.rating,
        location: v.location,
        ownerName: v.owner?.name || 'Unknown',
        ownerId: v.owner?._id?.toString() || null,
        ownerEmail: v.owner?.email || '',
        ownerPhone: v.owner?.phone || '',
        onboardingStatus: v.onboardingStatus || 'ACTIVE',
        bookingCount: countMap[v._id.toString()] || 0,
        joinedOn: v.createdAt,
        createdAt: v.createdAt,
      })),
      counts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return apiError(error, 'GET /api/admin/venues');
  }
}

export async function PATCH(request) {
  try {
    const session = await requireAdmin();
    if (!session) return forbidden();

    const { venueId, onboardingStatus } = await request.json();
    const ALLOWED = ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'];
    if (!venueId || !ALLOWED.includes(onboardingStatus)) {
      return badRequest('venueId and a valid onboardingStatus are required.');
    }

    await dbConnect();
    const venue = await Venue.findByIdAndUpdate(venueId, { $set: { onboardingStatus } }, { new: true });
    if (!venue) return notFound('Venue not found');

    return NextResponse.json({ venueId: venue._id.toString(), onboardingStatus: venue.onboardingStatus });
  } catch (error) {
    return apiError(error, 'PATCH /api/admin/venues');
  }
}

export async function DELETE(request) {
  try {
    const session = await requireAdmin();
    if (!session) return forbidden();

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');
    if (!venueId) return badRequest('venueId is required');

    await dbConnect();
    const venue = await Venue.findByIdAndDelete(venueId);
    if (!venue) return notFound('Venue not found');

    // Cascade cancel bookings and remove the venue's turfs/blocks (they would
    // otherwise be orphaned).
    await Promise.all([
      Booking.updateMany({ venue: venueId }, { status: 'CANCELLED' }),
      Turf.deleteMany({ venue: venueId }),
      BlockedSlot.deleteMany({ venue: venueId }),
    ]);

    return NextResponse.json({ message: 'Venue deleted successfully' });
  } catch (error) {
    return apiError(error, 'DELETE /api/admin/venues');
  }
}
