import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import Booking from '@/models/Booking';
import { auth } from '@/lib/auth';

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') return null;
  return session;
}

export async function GET(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const city = searchParams.get('city') || '';
    const search = searchParams.get('search') || '';

    await dbConnect();

    const query = {};
    if (city) query.city = { $regex: city, $options: 'i' };
    if (search) query.name = { $regex: search, $options: 'i' };

    const [venues, total] = await Promise.all([
      Venue.find(query)
        .populate('owner', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Venue.countDocuments(query),
    ]);

    // Get booking counts per venue
    const venueIds = venues.map((v) => v._id);
    const bookingCounts = await Booking.aggregate([
      { $match: { venue: { $in: venueIds }, bookingType: { $ne: 'OFFLINE' } } },
      { $group: { _id: '$venue', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    bookingCounts.forEach((b) => { countMap[b._id.toString()] = b.count; });

    return NextResponse.json({
      venues: venues.map((v) => ({
        id: v._id.toString(),
        name: v.name,
        city: v.city,
        area: v.area,
        address: v.address,
        sportTypes: v.sportTypes,
        pricePerHour: v.pricePerHour,
        images: v.images,
        amenities: v.amenities,
        rating: v.rating,
        ownerName: v.owner?.name || 'Unknown',
        ownerEmail: v.owner?.email || '',
        bookingCount: countMap[v._id.toString()] || 0,
        createdAt: v.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[GET /api/admin/venues]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');
    if (!venueId) return NextResponse.json({ message: 'venueId is required' }, { status: 400 });

    await dbConnect();
    const venue = await Venue.findByIdAndDelete(venueId);
    if (!venue) return NextResponse.json({ message: 'Venue not found' }, { status: 404 });

    // Cascade cancel bookings for this venue
    await Booking.updateMany({ venue: venueId }, { status: 'CANCELLED' });

    return NextResponse.json({ message: 'Venue deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/admin/venues]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
