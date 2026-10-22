import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { auth } from '@/lib/auth';
import crypto from 'crypto';
import { autoConfirmIfReady } from '@/lib/booking-utils';
import { fetchPayment, isCaptured } from '@/lib/razorpay';

export async function POST(request) {
  try {
    const authSession = await auth();
    if (!authSession) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ message: 'Missing payment verification details.' }, { status: 400 });
    }

    // 1. Verify Signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ message: 'Payments are not configured.' }, { status: 503 });
    }
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return NextResponse.json({ message: 'Invalid payment signature.' }, { status: 400 });
    }

    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 2. Find the bookings — scoped to the caller so one user can never
      // confirm another user's order.
      const bookings = await Booking.find({
        razorpayOrderId: razorpay_order_id,
        status: 'PAYMENT_PENDING',
        user: authSession.user.id,
      }).session(session);

      if (bookings.length === 0) {
        await session.abortTransaction();
        return NextResponse.json({ message: 'Booking not found or already processed.' }, { status: 404 });
      }

      // 3. Confirm the money actually moved. The signature only proves the
      //    response came from Razorpay's checkout — ask Razorpay whether the
      //    payment was captured before we hand out a booking.
      const payment = await fetchPayment(razorpay_payment_id);
      if (!payment.ok) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json({ message: 'Could not verify the payment.' }, { status: 400 });
      }
      if (!isCaptured(payment.payment)) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json(
          { message: `Payment is ${payment.payment?.status || 'not captured'} — not confirmed.` },
          { status: 400 }
        );
      }
      const paidAmount = (payment.payment?.amount || 0) / 100;
      const dueAmount = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      if (dueAmount > 0 && paidAmount + 0.01 < dueAmount) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json(
          { message: 'Payment amount does not cover this booking.' },
          { status: 400 }
        );
      }

      let confirmed = false;
      for (const booking of bookings) {
        booking.status = 'PENDING';
        booking.paymentId = razorpay_payment_id;
        booking.razorpaySignature = razorpay_signature;
        await booking.save({ session });

        // Trigger auto-confirm logic
        if (await autoConfirmIfReady(booking.venue, booking.date, booking.startTime, booking.endTime, booking.turf, session)) {
          confirmed = true;
        }
      }

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({ 
        message: confirmed
          ? 'Payment verified and booking confirmed!'
          : 'Payment verified. Waiting for players on the other side.',
        confirmed,
        bookingIds: bookings.map(b => b._id.toString())
      }, { status: 200 });

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }

  } catch (error) {
    console.error('[POST /api/payments/verify]', error);
    return NextResponse.json({ message: 'Verification failed.' }, { status: 500 });
  }
}
