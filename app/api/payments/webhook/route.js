import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { autoConfirmIfReady } from '@/lib/booking-utils';
import { refundPayment, fetchPayment } from '@/lib/razorpay';

/**
 * Razorpay webhook — the source of truth for "the money arrived".
 *
 * The browser flow (`/api/payments/verify`) confirms a booking when the
 * player comes back after checkout. This endpoint covers the case where they
 * never do: Razorpay tells us the payment was captured and we confirm the
 * booking ourselves. It also covers the case where the 15-minute hold was
 * cleaned up before the player paid — then the money is refunded.
 */
export async function POST(request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ message: 'Webhook is not configured.' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');
  if (!signature || !Razorpay.validateWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ message: 'Invalid signature.' }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: 'Invalid payload.' }, { status: 400 });
  }

  if (event.event !== 'payment.captured') {
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const payment = event.payload?.payment;
  const paymentId = payment?.id;
  const orderId = payment?.order_id;
  if (!paymentId || !orderId) {
    return NextResponse.json({ ok: true, ignored: 'no payment id' });
  }

  await dbConnect();

  const bookings = await Booking.find({ razorpayOrderId: orderId });

  if (bookings.length === 0) {
    // The hold expired and the booking was cleaned up — but the player paid.
    // Give the money back instead of keeping it.
    const current = await fetchPayment(paymentId);
    const alreadyRefunded = current.ok && current.payment?.refund_status && current.payment.refund_status !== 'none';
    if (alreadyRefunded) {
      return NextResponse.json({ ok: true, action: 'already-refunded' });
    }
    const amount = (payment.amount || current.payment?.amount || 0) / 100;
    const result = await refundPayment(paymentId, amount);
    return NextResponse.json(
      { ok: true, action: result.ok ? 'refunded' : 'refund-failed', error: result.error },
      { status: result.ok ? 200 : 502 }
    );
  }

  const pending = bookings.filter(b => b.status === 'PAYMENT_PENDING');
  if (pending.length === 0) {
    // Already confirmed by the browser flow or by an earlier webhook.
    return NextResponse.json({ ok: true, action: 'already-handled' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    for (const booking of pending) {
      booking.status = 'PENDING';
      booking.paymentId = paymentId;
      await booking.save({ session });
      await autoConfirmIfReady(booking.venue, booking.date, booking.startTime, booking.endTime, booking.turf, session);
    }
    await session.commitTransaction();
    session.endSession();
    return NextResponse.json({ ok: true, action: 'confirmed', count: pending.length });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('[POST /api/payments/webhook]', err);
    return NextResponse.json({ message: 'Could not confirm the booking.' }, { status: 500 });
  }
}
