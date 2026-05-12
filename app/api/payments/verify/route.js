import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { auth } from '@/lib/auth';
import crypto from 'crypto';
import { autoConfirmIfReady } from '@/lib/booking-utils';

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
    const secret = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';
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
      // 2. Find and update bookings
      const bookings = await Booking.find({ razorpayOrderId: razorpay_order_id, status: 'PAYMENT_PENDING' }).session(session);
      
      if (bookings.length === 0) {
        await session.abortTransaction();
        return NextResponse.json({ message: 'Booking not found or already processed.' }, { status: 404 });
      }

      for (const booking of bookings) {
        booking.status = 'PENDING';
        booking.paymentId = razorpay_payment_id;
        booking.razorpaySignature = razorpay_signature;
        await booking.save({ session });

        // Trigger auto-confirm logic
        await autoConfirmIfReady(booking.venue, booking.date, booking.startTime, booking.endTime, session);
      }

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({ 
        message: 'Payment verified and booking confirmed!',
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
