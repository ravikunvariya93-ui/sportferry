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
 * booking ourselves. If there is no live hold to attach it to, the money is
 * refunded rather than kept.
 */

async function refundCapturedPayment(paymentId, amount) {
  const current = await fetchPayment(paymentId);
  const alreadyRefunded = current.ok && current.payment?.refund_status && current.payment.refund_status !== 'none';
  if (alreadyRefunded) return { ok: true, action: 'already-refunded' };
  const result = await refundPayment(paymentId, amount);
  return { ok: result.ok, action: result.ok ? 'refunded' : 'refund-failed', error: result.error };
}

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

  // Cheap existence check outside the transaction to decide the no-hold case;
  // the actual status decision is re-read inside the transaction below.
  const hasAnyBooking = await Booking.exists({ razorpayOrderId: orderId });
  if (!hasAnyBooking) {
    const current = await fetchPayment(paymentId);
    const amount = (payment.amount || current.payment?.amount || 0) / 100;
    const result = await refundCapturedPayment(paymentId, amount);
    return NextResponse.json(
      { ok: result.ok, action: result.action, error: result.error },
      { status: result.ok ? 200 : 502 }
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Re-read with the transaction so a cancellation between the webhook
    // arriving and this point cannot be overwritten by a stale document.
    const pending = await Booking.find({ razorpayOrderId: orderId, status: 'PAYMENT_PENDING' }).session(session);

    if (pending.length === 0) {
      // All holds were cancelled, confirmed or expired — never keep the money.
      await session.commitTransaction();
      session.endSession();
      const current = await fetchPayment(paymentId);
      const amount = (payment.amount || current.payment?.amount || 0) / 100;
      const result = await refundCapturedPayment(paymentId, amount);
      return NextResponse.json(
        { ok: result.ok, action: result.action, error: result.error },
        { status: result.ok ? 200 : 502 }
      );
    }

    let confirmed = 0;
    for (const booking of pending) {
      // Conditional claim: if another request changed the status, skip it.
      const updated = await Booking.findOneAndUpdate(
        { _id: booking._id, status: 'PAYMENT_PENDING' },
        { $set: { status: 'PENDING', paymentId } },
        { session, new: true }
      );
      if (!updated) continue;
      await autoConfirmIfReady(booking.venue, booking.date, booking.startTime, booking.endTime, booking.turf, session);
      confirmed += 1;
    }

    await session.commitTransaction();
    session.endSession();
    return NextResponse.json({ ok: true, action: 'confirmed', count: confirmed });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('[POST /api/payments/webhook]', err);
    return NextResponse.json({ message: 'Could not confirm the booking.' }, { status: 500 });
  }
}
