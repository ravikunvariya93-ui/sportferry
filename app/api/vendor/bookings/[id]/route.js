import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { auth } from '@/lib/auth';
import { requireVendor, isValidObjectId } from '@/lib/vendorAuth';
import { bookingRef } from '@/lib/bookingRef';
import { releaseExpiredPendingBookings } from '@/lib/booking-utils';

export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    if (!isValidObjectId(params.id)) return NextResponse.json({ message: 'Invalid id.' }, { status: 400 });

    await dbConnect();
    await releaseExpiredPendingBookings({ user: session.user.id });

    const booking = await Booking.findById(params.id)
      .populate('venue', 'name area city owner')
      .populate('user', 'name email phone')
      .lean();
    if (!booking) return NextResponse.json({ message: 'Booking not found.' }, { status: 404 });
    if (String(booking.venue?.owner || '') !== session.user.id) {
      return NextResponse.json({ message: 'Booking not found.' }, { status: 404 });
    }

    const siblings = await Booking.find({
      venue: booking.venue._id,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      turf: booking.turf || 1,
      status: { $ne: 'CANCELLED' },
    }).populate('user', 'name').select('user offlineCustomerName playersCount classification teamSide status checkedInAt').lean();

    const roster = siblings.map((s) => ({
      name: s.user?.name || s.offlineCustomerName || 'Walk-in',
      playersCount: s.playersCount || 1,
      classification: s.classification,
      teamSide: s.teamSide || 1,
      status: s.status,
      checkedIn: Boolean(s.checkedInAt),
    }));

    const timeline = [
      { label: 'Booked', at: booking.createdAt, done: true },
      { label: 'Payment Received', at: booking.bookingType === 'OFFLINE' ? null : booking.createdAt, done: booking.bookingType !== 'OFFLINE' },
      { label: 'Confirmed', at: booking.status === 'CONFIRMED' || booking.status === 'CANCELLED' ? booking.updatedAt : null, done: ['CONFIRMED', 'CANCELLED'].includes(booking.status) },
      ...(booking.checkedInAt ? [{ label: 'Checked In', at: booking.checkedInAt, done: true }] : []),
      ...(booking.cancelledAt ? [{ label: 'Cancelled', at: booking.cancelledAt, done: true }] : []),
    ];

    return NextResponse.json({
      booking: {
        id: booking._id.toString(),
        ref: bookingRef(booking._id),
        venue: booking.venue.name,
        place: [booking.venue.area, booking.venue.city].filter(Boolean).join(', '),
        date: new Date(booking.date).toISOString().slice(0, 10),
        startTime: booking.startTime,
        endTime: booking.endTime,
        sport: booking.sport,
        classification: booking.classification,
        playersCount: booking.playersCount || 1,
        amount: booking.totalAmount || 0,
        commissionPercent: booking.commissionPercent || 12,
        commissionAmount: booking.commissionAmount || 0,
        status: booking.status,
        bookingType: booking.bookingType,
        customerName: booking.user?.name || booking.offlineCustomerName || 'Walk-in',
        checkedInAt: booking.checkedInAt || null,
        turf: booking.turf || 1,
      },
      roster,
      timeline,
    });
  } catch (error) {
    console.error('[GET /api/vendor/bookings/[id]]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
