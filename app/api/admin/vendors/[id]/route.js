import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { apiError } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import Booking from '@/models/Booking';
import Withdrawal from '@/models/Withdrawal';
import { auth, hasRole } from '@/lib/auth';
import { COMMISSION_PERCENT } from '@/lib/constants';
import { loadTurfs } from '@/lib/turfs';
import { bookingRef } from '@/lib/bookingRef';
import { commissionOf } from '@/lib/payouts';
import { releaseExpiredPendingBookings } from '@/lib/booking-utils';

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export async function GET(request, { params }) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    if (!OBJECT_ID_RE.test(String(params.id || ''))) {
      return NextResponse.json({ message: 'Invalid id.' }, { status: 400 });
    }

    await dbConnect();
    const venue = await Venue.findById(params.id).populate('owner', 'name email phone city bankDetails createdAt').lean();
    if (!venue) return NextResponse.json({ message: 'Vendor not found.' }, { status: 404 });

    await releaseExpiredPendingBookings({ venue: venue._id });

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [turfs, recent, recent30] = await Promise.all([
      loadTurfs(venue._id),
      Booking.find({ venue: venue._id })
        .sort({ createdAt: -1 }).limit(10)
        .populate('user', 'name')
        .select('startTime endTime date status totalAmount bookingType classification playersCount offlineCustomerName user createdAt')
        .lean(),
      Booking.find({ venue: venue._id, createdAt: { $gte: since }, status: { $ne: 'CANCELLED' } })
        .select('totalAmount playersCount status bookingType').lean(),
    ]);

    const bookingsValue = recent30.filter(b => b.status === 'CONFIRMED').reduce((s, b) => s + (b.totalAmount || 0), 0);
    const players = recent30.reduce((s, b) => s + (b.playersCount || 0), 0);
    const capacity = Math.max(1, Number(venue.numberOfTurfs) || 1) * 12 * 30;

    const withdrawals = await Withdrawal.find({ vendor: venue.owner?._id }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      venue: {
        id: venue._id.toString(),
        name: venue.name,
        city: venue.city,
        area: venue.area,
        address: venue.address,
        sportTypes: venue.sportTypes || [],
        images: venue.images || [],
        amenities: venue.amenities || [],
        pricePerHour: venue.pricePerHour,
        pricing: venue.pricing || {},
        discountPercent: venue.discountPercent || 0,
        onboardingStatus: venue.onboardingStatus || 'ACTIVE',
        documents: venue.documents || {},
        joinedOn: venue.createdAt,
      },
      owner: {
        id: venue.owner?._id?.toString() || null,
        name: venue.owner?.name || 'Unknown',
        email: venue.owner?.email || '',
        phone: venue.owner?.phone || '',
        city: venue.owner?.city || '',
        bankDetails: venue.owner?.bankDetails || {},
      },
      turfs: turfs.map(t => ({ id: t._id.toString(), name: t.name, order: t.order, sport: t.sport, size: t.size, surface: t.surface, playingFormat: t.playingFormat, lighting: t.lighting })),
      performance: {
        bookings: recent30.length,
        bookingValue: bookingsValue,
        commission: commissionOf(bookingsValue, COMMISSION_PERCENT),
        fillRate: Math.min(100, Math.round((players / capacity) * 100)),
      },
      withdrawals: withdrawals.map(w => ({ id: w._id.toString(), month: w.month, year: w.year, netAmount: w.netAmount, status: w.status, requestedAt: w.requestedAt })),
      activity: recent.map(b => ({
        id: b._id.toString(),
        ref: bookingRef(b._id),
        userName: b.bookingType === 'OFFLINE' ? (b.offlineCustomerName || 'Walk-in') : (b.user?.name || 'Player'),
        date: b.date,
        slot: `${b.startTime} – ${b.endTime}`,
        status: b.status,
        bookingType: b.bookingType,
        classification: b.classification,
        playersCount: b.playersCount,
        amount: b.totalAmount,
      })),
      commissionPercent: COMMISSION_PERCENT,
    });
  } catch (error) {
    return apiError(error, 'GET /api/admin/vendors/[id]');
  }
}
