import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { apiError, forbidden, badRequest, notFound, conflict } from '@/lib/apiResponse';
import { parseListParams } from '@/lib/apiParams';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { applyCancellation } from '@/lib/cancelBooking';
import { autoConfirmIfReady, releaseExpiredPendingBookings } from '@/lib/booking-utils';
import { getISTDayRange, istTodayISO, formatBookingDate } from '@/lib/ist';
import { bookingRef } from '@/lib/bookingRef';
import { escapeRegex } from '@/lib/validation';
import { claimCancelled } from '@/lib/bookingClaims';

export async function GET(request) {
  try {
    const session = await requireAdmin();
    if (!session) return forbidden();

    const { page, limit, skip, searchParams } = parseListParams(request, { limit: 25 });
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
        .skip(skip)
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
        dateStr: formatBookingDate(b.date, { day: '2-digit' }),
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
    return apiError(error, 'GET /api/admin/bookings');
  }
}

export async function PATCH(request) {
  try {
    const session = await requireAdmin();
    if (!session) return forbidden();

    const { bookingId, status, cancellationReason } = await request.json();
    if (!bookingId || !status) return badRequest('bookingId and status are required');
    if (!['PENDING', 'CONFIRMED', 'CANCELLED'].includes(status)) {
      return badRequest('Invalid status');
    }

    await dbConnect();
    const booking = await Booking.findById(bookingId);
    if (!booking) return notFound('Booking not found');

    if (booking.status === 'CANCELLED' && status !== 'CANCELLED') {
      return badRequest('A cancelled booking cannot be re-activated.');
    }
    if (status === 'CONFIRMED' && booking.status === 'PAYMENT_PENDING') {
      return badRequest('A payment-pending hold can only be confirmed by payment.');
    }

    if (status === 'CANCELLED') {
      if (booking.status === 'PAYMENT_PENDING') {
        return NextResponse.json({
          message: 'A payment-pending booking cannot be cancelled — wait for payment or hold expiry.',
        }, { status: 400 });
      }
      // Claim first: two concurrent cancels must never execute the same refund.
      const claimed = await claimCancelled(booking._id);
      if (!claimed) return conflict('Booking is already cancelled');

      // Cancels, records the 100% admin refund and executes it against Razorpay.
      await applyCancellation(booking, {
        cancelledBy: 'ADMIN',
        reason: cancellationReason?.trim() || 'Cancelled by admin',
      });

      // Save only the fields the refund actually changed. Saving the whole
      // in-memory document would rewrite `status` from the stale pre-claim read
      // and could clobber a concurrent update.
      const update = {
        status: booking.status,
        cancelledBy: booking.cancelledBy,
        cancelledAt: booking.cancelledAt,
        cancellationReason: booking.cancellationReason,
        refundPercent: booking.refundPercent,
        refundAmount: booking.refundAmount,
        refundStatus: booking.refundStatus,
      };
      if (booking.refundId) update.refundId = booking.refundId;
      const saved = await Booking.findByIdAndUpdate(booking._id, { $set: update }, { new: true });

      // An admin approval can be what fills a turf up — confirm the rest of it.
      if (saved?.status === 'CONFIRMED') {
        await autoConfirmIfReady(saved.venue, saved.date, saved.startTime, saved.endTime, saved.turf);
      }

      return NextResponse.json({
        id: saved._id.toString(),
        status: saved.status,
        refundStatus: saved.refundStatus ?? 'NONE',
      });
    }

    booking.status = status;
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
    return apiError(error, 'PATCH /api/admin/bookings');
  }
}
