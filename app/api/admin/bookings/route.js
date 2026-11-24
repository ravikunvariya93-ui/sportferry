import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { auth, hasRole } from '@/lib/auth';
import { applyCancellation } from '@/lib/cancelBooking';
import { autoConfirmIfReady, releaseExpiredPendingBookings } from '@/lib/booking-utils';
import { getISTDayRange, istTodayISO } from '@/lib/ist';
import { bookingRef } from '@/lib/bookingRef';
import { escapeRegex } from '@/lib/validation';

async function requireAdmin() {
  const session = await auth();
  if (!session || !(await hasRole(session, 'ADMIN'))) return null;
  return session;
}

export async function GET(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    let limit = parseInt(searchParams.get('limit') || '25');
    if (limit > 100) limit = 100;
    if (limit < 1) limit = 1;
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const venueId = searchParams.get('venueId') || '';
    const city = searchParams.get('city') || '';
    const bookingType = searchParams.get('bookingType') || '';
    const classification = searchParams.get('classification') || '';
    const search = searchParams.get('search') || '';

    await dbConnect();

    // Past slots that never filled are stale — move them to CANCELLED before
    // filtering so the status tabs and counts agree.
    await releaseExpiredPendingBookings();

    const query = { status: { $ne: 'PAYMENT_PENDING' } };
    if (status) query.status = status;
    if (bookingType) query.bookingType = bookingType;
    if (classification) query.classification = classification;
    if (venueId) query.venue = venueId;
    
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) {
        query.date.$gte = getISTDayRange(dateFrom).startUTC;
      }
      if (dateTo) {
        query.date.$lte = getISTDayRange(dateTo).endUTC;
      }
    }

    // For city filter, we need to find venue IDs in that city first
    if (city && !venueId) {
      const Venue = (await import('@/models/Venue')).default;
      const venuesInCity = await Venue.find({ city }).select('_id').lean();
      query.venue = { $in: venuesInCity.map(v => v._id) };
    }

    // For search, we need to find matching users first
    let userFilter = null;
    if (search) {
      const User = (await import('@/models/User')).default;
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      const matchingUsers = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
        ]
      }).select('_id').lean();
      userFilter = matchingUsers.map(u => u._id);
      
      // Also match offline customer name/phone
      query.$or = [
        { user: { $in: userFilter } },
        { offlineCustomerName: searchRegex },
        { offlineCustomerPhone: searchRegex },
      ];
    }

    // The filters above (excluding the tab) are the base for the tab counts.
    const baseQuery = { ...query };

    // Status-tab shortcut (ignored when an explicit status is set).
    const tab = searchParams.get('tab') || '';
    if (!status && tab) {
      const today = getISTDayRange(istTodayISO());
      if (tab === 'UPCOMING') { query.status = { $in: ['PENDING', 'CONFIRMED'] }; query.date = { $gte: today.startUTC }; }
      else if (tab === 'ACTIVE') { query.status = { $in: ['PENDING', 'CONFIRMED'] }; query.date = { $gte: today.startUTC, $lte: today.endUTC }; }
      else if (tab === 'COMPLETED') { query.status = 'CONFIRMED'; query.date = { $lt: today.startUTC }; }
      else if (tab === 'CANCELLED') { query.status = 'CANCELLED'; }
    }

    const [bookings, total, counts] = await Promise.all([
      Booking.find(query)
        .populate('venue', 'name city area')
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query),
      (async () => {
        const today = getISTDayRange(istTodayISO());
        const base = { ...baseQuery };
        const [all, upcoming, active, completed, cancelled] = await Promise.all([
          Booking.countDocuments(base),
          Booking.countDocuments({ ...base, status: { $in: ['PENDING', 'CONFIRMED'] }, date: { $gte: today.startUTC } }),
          Booking.countDocuments({ ...base, status: { $in: ['PENDING', 'CONFIRMED'] }, date: { $gte: today.startUTC, $lte: today.endUTC } }),
          Booking.countDocuments({ ...base, status: 'CONFIRMED', date: { $lt: today.startUTC } }),
          Booking.countDocuments({ ...base, status: 'CANCELLED' }),
        ]);
        return { ALL: all, UPCOMING: upcoming, ACTIVE: active, COMPLETED: completed, CANCELLED: cancelled };
      })(),
    ]);

    return NextResponse.json({
      bookings: bookings.map((b) => ({
        id: b._id.toString(),
        ref: bookingRef(b._id),
        venueName: b.venue?.name || 'N/A',
        venueCity: b.venue?.city || '',
        venueArea: b.venue?.area || '',
        userName: b.user?.name || b.offlineCustomerName || 'Walk-in',
        userId: b.user?._id?.toString() || null,
        userEmail: b.user?.email || '',
        userPhone: b.user?.phone || b.offlineCustomerPhone || '',
        date: b.date,
        dateStr: new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        startTime: b.startTime,
        endTime: b.endTime,
        slot: `${b.startTime} – ${b.endTime}`,
        status: b.status,
        classification: b.classification || 'SOLO',
        playersCount: b.playersCount || 1,
        turf: b.turf || 1,
        sport: b.sport || '',
        bookingType: b.bookingType,
        amount: b.totalAmount,
        paymentId: b.paymentId || '',
        createdAt: b.createdAt,
        // Cancellation metadata
        cancelledBy: b.cancelledBy || null,
        cancelledAt: b.cancelledAt || null,
        cancellationReason: b.cancellationReason || null,
        refundPercent: b.refundPercent ?? 0,
        refundAmount: b.refundAmount ?? 0,
        refundStatus: b.refundStatus ?? 'NONE',
      })),
      counts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[GET /api/admin/bookings]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { bookingId, status, cancellationReason } = await request.json();
    if (!bookingId || !status) return NextResponse.json({ message: 'bookingId and status are required' }, { status: 400 });
    if (!['PENDING', 'CONFIRMED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    await dbConnect();
    const booking = await Booking.findById(bookingId);
    if (!booking) return NextResponse.json({ message: 'Booking not found' }, { status: 404 });

    if (booking.status === 'CANCELLED' && status !== 'CANCELLED') {
      return NextResponse.json({ message: 'A cancelled booking cannot be re-activated.' }, { status: 400 });
    }
    if (status === 'CONFIRMED' && booking.status === 'PAYMENT_PENDING') {
      return NextResponse.json({ message: 'A payment-pending hold can only be confirmed by payment.' }, { status: 400 });
    }

    if (status === 'CANCELLED') {
      if (booking.status === 'PAYMENT_PENDING') {
        return NextResponse.json({
          message: 'A payment-pending booking cannot be cancelled — wait for payment or hold expiry.',
        }, { status: 400 });
      }
      // Claim first: two concurrent cancels must never execute the same refund.
      const claimed = await Booking.findOneAndUpdate(
        { _id: booking._id, status: { $ne: 'CANCELLED' } },
        { $set: { status: 'CANCELLED' } },
        { new: true }
      );
      if (!claimed) return NextResponse.json({ message: 'Booking is already cancelled' }, { status: 409 });

      // Cancels, records the 100% admin refund and executes it against Razorpay.
      await applyCancellation(booking, {
        cancelledBy: 'ADMIN',
        reason: cancellationReason?.trim() || 'Cancelled by admin',
      });
    } else {
      booking.status = status;
    }

    await booking.save();

    // An admin approval can be what fills a turf up — confirm the rest of it.
    if (booking.status === 'CONFIRMED') {
      await autoConfirmIfReady(booking.venue, booking.date, booking.startTime, booking.endTime, booking.turf);
    }

    return NextResponse.json({
      id: booking._id.toString(),
      status: booking.status,
      refundStatus: booking.refundStatus ?? 'NONE',
    });
  } catch (error) {
    console.error('[PATCH /api/admin/bookings]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
