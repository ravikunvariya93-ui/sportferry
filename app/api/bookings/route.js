import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';

/**
 * Parse a slot label like "06:00 AM – 07:00 AM" into 24-hour startTime / endTime strings.
 */
function parseSlot(slot) {
  const parts = slot.split('–').map((s) => s.trim());
  if (parts.length !== 2) return null;

  function to24h(timeStr) {
    const [time, meridiem] = timeStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return { startTime: to24h(parts[0]), endTime: to24h(parts[1]) };
}

export async function POST(request) {
  let session = null;
  try {
    const authSession = await auth();
    if (!authSession) {
      return NextResponse.json({ message: 'You must be logged in to book.' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      venueId, date, slot, sport, classification, 
      playersCount: rawPlayersCount = 1,
      bookingType = 'ONLINE', 
      offlineCustomerName, 
      offlineCustomerPhone 
    } = body;

    // 1. Basic Validation
    if (!venueId || !date || !slot || !sport || !classification) {
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

    // 3. Slot Parse & Duration Validation
    const times = parseSlot(slot);
    if (!times) {
      return NextResponse.json({ message: 'Invalid slot format.' }, { status: 400 });
    }

    // Verify 3-hour duration
    const [startH, startM] = times.startTime.split(':').map(Number);
    const [endH, endM] = times.endTime.split(':').map(Number);
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    // Handle midnight wrap if necessary, but our slots are within one day or end at 12:00 AM
    const totalMinutes = durationMinutes < 0 ? durationMinutes + 1440 : durationMinutes;
    if (totalMinutes !== 180 && slot !== '09:00 PM – 12:00 AM') { 
        // Note: 21:00 to 00:00 is 3 hours but math might be 0-21 = -21. 
        // Our 09:00 PM - 12:00 AM logic needs care.
    }
    // Simplification: trust the labels for now but the math 21:00 to 00:00 is 180 mins if handled as 24:00
    const endHAdjusted = endH === 0 ? 24 : endH;
    const duration = (endHAdjusted * 60 + endM) - (startH * 60 + startM);
    if (duration !== 180) {
      return NextResponse.json({ message: 'Invalid slot duration. Only 3-hour slots are allowed.' }, { status: 400 });
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

    // 6. Capacity Check (Atomic within Transaction)
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
        return NextResponse.json({ message: 'Slot not empty for Group booking.' }, { status: 409 });
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
           // If side 2 already has someone (Team) but side 1 is empty, usually we fill side 1 first.
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

    const booking = await Booking.create([{
      venue: venueId,
      user: bookingType === 'ONLINE' ? authSession.user.id : null,
      date: bookingDate,
      startTime: times.startTime,
      endTime: times.endTime,
      totalAmount: bookingType === 'OFFLINE' ? 0 : venue.pricePerHour * 3,
      status: bookingType === 'OFFLINE' ? 'CONFIRMED' : 'PENDING',
      bookingType,
      sport,
      classification,
      playersCount,
      teamSide: assignedSide,
      offlineCustomerName: bookingType === 'OFFLINE' ? (offlineCustomerName || 'Manual Block') : undefined,
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ bookingId: booking[0]._id.toString() }, { status: 201 });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error('[POST /api/bookings]', error);
    return NextResponse.json({ message: 'Booking failed. Please try again.' }, { status: 500 });
  }
}

