import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';
import crypto from 'crypto';
import { parseSlot, autoConfirmIfReady } from '@/lib/booking-utils';

const COMMISSION_PERCENT = 12;

export async function POST(request) {
  let session = null;
  try {
    const authSession = await auth();
    if (!authSession) {
      return NextResponse.json({ message: 'You must be logged in to book.' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      venueId, date, slot, slots, sport, classification, 
      playersCount: rawPlayersCount = 1,
      bookingType = 'ONLINE', 
      offlineCustomerName, 
      offlineCustomerPhone 
    } = body;

    // Support both single slot and multiple slots
    const slotList = slots && Array.isArray(slots) && slots.length > 0 ? slots : (slot ? [slot] : []);

    // 1. Basic Validation
    if (!venueId || !date || slotList.length === 0 || !sport || !classification) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    const playersCount = Math.floor(Number(rawPlayersCount));
    if (isNaN(playersCount) || playersCount < 1) {
      return NextResponse.json({ message: 'Invalid players count.' }, { status: 400 });
    }

    // 2. Date Validation (Must be today or future)
    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      return NextResponse.json({ message: 'Cannot book for a past date.' }, { status: 400 });
    }

    // 3. Validate all slots
    const parsedSlots = [];
    for (const s of slotList) {
      const times = parseSlot(s);
      if (!times) {
        return NextResponse.json({ message: `Invalid slot format: ${s}` }, { status: 400 });
      }

      // Verify 1-hour duration
      const [startH, startM] = times.startTime.split(':').map(Number);
      const [endH, endM] = times.endTime.split(':').map(Number);
      const endHAdjusted = endH === 0 ? 24 : endH;
      const duration = (endHAdjusted * 60 + endM) - (startH * 60 + startM);
      if (duration !== 60) {
        return NextResponse.json({ message: 'Invalid slot duration. Only 1-hour slots are allowed.' }, { status: 400 });
      }
      parsedSlots.push(times);
    }

    // 4. Classification Limits
    if (classification === 'SOLO' && (playersCount < 1 || playersCount > 2)) {
      return NextResponse.json({ message: 'Solo bookings: 1-2 players.' }, { status: 400 });
    }
    if (classification === 'TEAM' && (playersCount < 3 || playersCount > 6)) {
      return NextResponse.json({ message: 'Team bookings: 3-6 players.' }, { status: 400 });
    }
    if (classification === 'GROUP' && playersCount !== 12) {
      return NextResponse.json({ message: 'Group bookings: exactly 12 players.' }, { status: 400 });
    }

    await dbConnect();
    const mongooseConnection = mongoose.connection;
    session = await mongooseConnection.startSession();
    session.startTransaction();

    const venue = await Venue.findById(venueId).session(session).lean();
    if (!venue) {
      await session.abortTransaction();
      return NextResponse.json({ message: 'Venue not found.' }, { status: 404 });
    }

    // 5. Authorization for Offline
    if (bookingType === 'OFFLINE' && venue.owner.toString() !== authSession.user.id) {
      await session.abortTransaction();
      return NextResponse.json({ message: 'Unauthorized for offline booking.' }, { status: 403 });
    }

    // Generate a groupId if booking multiple slots
    const groupId = slotList.length > 1 ? crypto.randomUUID() : undefined;

    const createdBookings = [];

    // 6. Process each slot
    for (let i = 0; i < parsedSlots.length; i++) {
      const times = parsedSlots[i];

      // Capacity Check (Atomic within Transaction)
      const existingBookings = await Booking.find({
        venue: venueId,
        date: bookingDate,
        startTime: times.startTime,
        endTime: times.endTime,
        status: { $ne: 'CANCELLED' },
      }).session(session).lean();

      const team1Count = existingBookings.filter(b => b.teamSide === 1).reduce((s, b) => s + b.playersCount, 0);
      const team2Count = existingBookings.filter(b => b.teamSide === 2).reduce((s, b) => s + b.playersCount, 0);
      const hasSoloSide1 = existingBookings.some(b => b.teamSide === 1 && b.classification === 'SOLO');
      const hasSoloSide2 = existingBookings.some(b => b.teamSide === 2 && b.classification === 'SOLO');

      let assignedSide = 1;

      if (classification === 'GROUP') {
        if (existingBookings.length > 0) {
          await session.abortTransaction();
          return NextResponse.json({ message: `Slot ${slotList[i]} is not empty for Group booking.` }, { status: 409 });
        }
      } else {
        // Imbalance rule
        if (team1Count === 5 && playersCount === 4) {
          await session.abortTransaction();
          return NextResponse.json({ message: 'Choose another turf because there is more players are playing against this turf' }, { status: 409 });
        }

        // Side-filling logic
        if (classification === 'SOLO') {
          if (hasSoloSide2 && team2Count < 6) {
            assignedSide = 2;
          } else if (hasSoloSide1 && team1Count < 6) {
            assignedSide = 1;
          } else if (team2Count > 0 && team2Count < 6 && !hasSoloSide1) { 
            assignedSide = 1;
          } else if (team1Count < 6) {
            assignedSide = 1;
          } else if (team2Count < 6) {
            assignedSide = 2;
          } else {
            await session.abortTransaction();
            return NextResponse.json({ message: 'Capacity full.' }, { status: 409 });
          }
        } else {
          // TEAM booking
          if (team1Count + playersCount <= 6) {
            assignedSide = 1;
          } else if (team2Count + playersCount <= 6) {
            assignedSide = 2;
          } else {
            await session.abortTransaction();
            return NextResponse.json({ message: 'No side has enough space.' }, { status: 409 });
          }
        }
      }

      const slotAmount = bookingType === 'OFFLINE' ? 0 : venue.pricePerHour * playersCount;
      const commissionAmount = Math.round(slotAmount * COMMISSION_PERCENT / 100);

      const booking = await Booking.create([{
        venue: venueId,
        user: bookingType === 'ONLINE' ? authSession.user.id : null,
        date: bookingDate,
        startTime: times.startTime,
        endTime: times.endTime,
        totalAmount: slotAmount,
        commissionPercent: COMMISSION_PERCENT,
        commissionAmount,
        status: bookingType === 'OFFLINE' ? 'CONFIRMED' : 'PENDING',
        bookingType,
        sport,
        classification,
        playersCount,
        teamSide: assignedSide,
        groupId,
        offlineCustomerName: bookingType === 'OFFLINE' ? (offlineCustomerName || 'Manual Block') : undefined,
      }], { session });

      createdBookings.push(booking[0]);

      // Auto-confirm check: if both teams now have >= 3 players, confirm all PENDING
      if (bookingType === 'ONLINE') {
        await autoConfirmIfReady(venueId, bookingDate, times.startTime, times.endTime, session);
      }
    }

    await session.commitTransaction();
    session.endSession();

    const bookingIds = createdBookings.map(b => b._id.toString());

    return NextResponse.json({ 
      bookingId: bookingIds[0], 
      bookingIds,
      slotsBooked: slotList.length,
    }, { status: 201 });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error('[POST /api/bookings]', error);
    return NextResponse.json({ message: 'Booking failed. Please try again.' }, { status: 500 });
  }
}
