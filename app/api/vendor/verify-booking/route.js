import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { auth } from '@/lib/auth';
import { istTodayISO, slotStartInstant } from '@/lib/ist';

const ID_RE = /[a-f0-9]{24}/i;

function parseBookingId(code) {
  if (!code) return null;
  const match = String(code).trim().match(ID_RE);
  return match ? match[0] : null;
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'VENDOR') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { code, action } = await request.json();
    const id = parseBookingId(code);
    if (!id) {
      return NextResponse.json({ ok: false, verdict: 'INVALID', message: 'That does not look like a Sportferry ticket.' });
    }

    await dbConnect();

    const booking = await Booking.findById(id)
      .populate('venue', 'name area city owner')
      .populate('user', 'name email phone')
      .lean();

    if (!booking) {
      return NextResponse.json({ ok: false, verdict: 'NOT_FOUND', message: 'No booking found for this ticket.' });
    }

    const ownerId = booking.venue?.owner ? String(booking.venue.owner) : '';
    if (ownerId !== session.user.id) {
      return NextResponse.json({ ok: false, verdict: 'NOT_YOURS', message: 'This ticket is for a venue you do not own.' });
    }

    const dateISO = new Date(booking.date).toISOString().slice(0, 10);
    const todayISO = istTodayISO();
    const start = slotStartInstant(dateISO, booking.startTime);
    const end = slotStartInstant(dateISO, booking.endTime);
    const now = new Date();

    let verdict = 'VALID';
    let message = 'Valid ticket — let them in!';

    if (booking.status === 'CANCELLED') {
      verdict = 'CANCELLED';
      message = 'This booking was cancelled.';
    } else if (booking.status === 'PAYMENT_PENDING') {
      verdict = 'UNPAID';
      message = 'Payment for this booking was never completed.';
    } else if (dateISO !== todayISO) {
      verdict = 'NOT_TODAY';
      message = `This ticket is for ${dateISO}, not today.`;
    } else if (now.getTime() > end.getTime()) {
      verdict = 'EXPIRED';
      message = 'This slot has already ended.';
    } else if (now.getTime() < start.getTime() - 60 * 60 * 1000) {
      verdict = 'TOO_EARLY';
      message = 'This ticket is for a later slot today.';
    } else if (booking.status !== 'CONFIRMED') {
      verdict = 'NOT_CONFIRMED';
      message = `This booking is ${booking.status}, not confirmed yet.`;
    }

    const valid = verdict === 'VALID';

    const payload = {
      id: booking._id.toString(),
      status: booking.status,
      bookingType: booking.bookingType,
      venue: booking.venue
        ? [booking.venue.name, [booking.venue.area, booking.venue.city].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
        : 'Venue',
      customerName: booking.user?.name || booking.offlineCustomerName || 'Walk-in',
      customerEmail: booking.user?.email || '',
      customerPhone: booking.user?.phone || booking.offlineCustomerPhone || '',
      dateISO,
      startTime: booking.startTime,
      endTime: booking.endTime,
      sport: booking.sport,
      classification: booking.classification,
      playersCount: booking.playersCount || 1,
      amount: booking.totalAmount ?? 0,
      checkedInAt: booking.checkedInAt ? new Date(booking.checkedInAt).toISOString() : null,
    };

    if (action === 'checkin') {
      if (!valid) {
        return NextResponse.json({ ok: false, verdict, message, booking: payload });
      }
      if (booking.checkedInAt) {
        return NextResponse.json({ ok: false, verdict: 'ALREADY_USED', message: 'This ticket was already checked in.', booking: payload });
      }
      await Booking.updateOne({ _id: booking._id }, { $set: { checkedInAt: new Date() } });
      return NextResponse.json({
        ok: true,
        verdict: 'CHECKED_IN',
        message: 'Checked in. Have a great game!',
        booking: { ...payload, checkedInAt: new Date().toISOString() },
      });
    }

    return NextResponse.json({ ok: valid, verdict, message, booking: payload });
  } catch (error) {
    console.error('[POST /api/vendor/verify-booking]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
