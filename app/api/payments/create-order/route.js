import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { parseSlot, cleanupExpiredPayments, getISTDayRange } from '@/lib/booking-utils';

const COMMISSION_PERCENT = 12;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
});

export async function POST(request) {
  let session = null;
  try {
    const authSession = await auth();
    if (!authSession) {
      return NextResponse.json({ message: 'You must be logged in to book.' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      venueId, date, slots, sport, classification, 
      playersCount: rawPlayersCount = 1,
    } = body;

    const slotList = Array.isArray(slots) ? slots : [];
    if (!venueId || !date || slotList.length === 0 || !sport || !classification) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    const playersCount = Math.floor(Number(rawPlayersCount));
    
    // Use robust UTC-based date for storing
    const [year, month, day] = date.split('-').map(Number);
    const bookingDate = new Date(Date.UTC(year, month - 1, day));
    
    const { startUTC, endUTC } = getISTDayRange(date);

    await dbConnect();
    const mongooseConnection = mongoose.connection;
    session = await mongooseConnection.startSession();
    session.startTransaction();

    await cleanupExpiredPayments(session);

    const venue = await Venue.findById(venueId).session(session).lean();
    if (!venue) {
      await session.abortTransaction();
      return NextResponse.json({ message: 'Venue not found.' }, { status: 404 });
    }

    const parsedSlots = [];
    for (const s of slotList) {
      const times = parseSlot(s);
      if (!times) {
        await session.abortTransaction();
        return NextResponse.json({ message: `Invalid slot format: ${s}` }, { status: 400 });
      }
      parsedSlots.push(times);
    }

    const groupId = slotList.length > 1 ? crypto.randomUUID() : undefined;
    const totalAmount = venue.pricePerHour * playersCount * slotList.length;

    // 1. Create Razorpay Order
    const options = {
      amount: totalAmount * 100, // in paisa
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    };
    
    const order = await razorpay.orders.create(options);

    // 2. Create PAYMENT_PENDING bookings
    const createdBookings = [];
    for (let i = 0; i < parsedSlots.length; i++) {
      const times = parsedSlots[i];

      // Capacity Check (Atomic within Transaction)
      const existingBookings = await Booking.find({
        venue: venueId,
        date: { $gte: startUTC, $lte: endUTC },
        startTime: times.startTime,
        endTime: times.endTime,
        status: { $ne: 'CANCELLED' },
      }).session(session).lean();

      const team1Count = existingBookings.filter(b => b.teamSide === 1).reduce((s, b) => s + b.playersCount, 0);
      const team2Count = existingBookings.filter(b => b.teamSide === 2).reduce((s, b) => s + b.playersCount, 0);
      
      let assignedSide = 1;
      if (classification === 'GROUP') {
        if (existingBookings.length > 0 || team1Count > 0 || team2Count > 0) {
          await session.abortTransaction();
          return NextResponse.json({ message: `Slot ${slotList[i]} is already partially booked. Group booking requires an empty slot.` }, { status: 409 });
        }
      } else {
        if (team1Count + playersCount <= 6) assignedSide = 1;
        else if (team2Count + playersCount <= 6) assignedSide = 2;
        else {
          await session.abortTransaction();
          return NextResponse.json({ message: `Slot ${slotList[i]} has no enough space.` }, { status: 409 });
        }
      }

      const commissionAmount = Math.round((venue.pricePerHour * playersCount) * COMMISSION_PERCENT / 100);

      const booking = await Booking.create([{
        venue: venueId,
        user: authSession.user.id,
        date: bookingDate,
        startTime: times.startTime,
        endTime: times.endTime,
        totalAmount: venue.pricePerHour * playersCount,
        commissionPercent: COMMISSION_PERCENT,
        commissionAmount,
        status: 'PAYMENT_PENDING',
        bookingType: 'ONLINE',
        sport,
        classification,
        playersCount,
        teamSide: assignedSide,
        groupId,
        razorpayOrderId: order.id,
      }], { session });

      createdBookings.push(booking[0]);
    }

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      venueName: venue.name,
      customerName: authSession.user.name,
      customerEmail: authSession.user.email,
      customerPhone: authSession.user.phone,
    }, { status: 201 });

  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error('[POST /api/payments/create-order]', error);
    return NextResponse.json({ message: 'Failed to initiate payment.' }, { status: 500 });
  }
}
