import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';
import crypto from 'crypto';
import { getISTDayRange, istTodayISO, parseBookableSlot } from '@/lib/ist';
import { allocateBooking, turfCountOf, blockReason } from '@/lib/capacity';
import { runBookingTransaction, lockSlot, slotLockKey, BookingError } from '@/lib/bookingTransactions';
import { COMMISSION_PERCENT } from '@/lib/constants';

export async function POST(request) {
  try {
    const authSession = await auth();
    if (!authSession) {
      return NextResponse.json({ message: 'You must be logged in to book.' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      venueId, date, slot, slots, sport, classification, 
      playersCount: rawPlayersCount = 1, 
      preferredSide,
      bookingType = 'ONLINE', 
      offlineCustomerName, 
      offlineCustomerPhone 
    } = body;

    // Support both single slot and multiple slots
    const slotList = slots && Array.isArray(slots) && slots.length > 0 ? slots : (slot ? [slot] : []);
    if (slotList.length > 20) {
      return NextResponse.json({ message: 'Too many slots in a single booking.' }, { status: 400 });
    }

    // 1. Basic Validation
    if (!venueId || !date || slotList.length === 0 || !sport || !classification) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // This endpoint is reserved for OFFLINE (walk-in) blocks only. Online bookings
    // must go through /api/payments/create-order so payment is actually captured.
    if (bookingType !== 'OFFLINE') {
      return NextResponse.json(
        { message: 'Online bookings must be made through the payment flow.' },
        { status: 400 }
      );
    }

    const playersCount = Math.floor(Number(rawPlayersCount));
    if (isNaN(playersCount) || playersCount < 1) {
      return NextResponse.json({ message: 'Invalid players count.' }, { status: 400 });
    }

    // Use robust UTC-based date for storing
    const [year, month, day] = date.split('-').map(Number);
    const bookingDate = new Date(Date.UTC(year, month - 1, day));

    const { startUTC, endUTC } = getISTDayRange(date);

    // 2. Date Validation (Must be today or future) — against the IST calendar
    // day, not the server's local midnight, which silently rejected same-day
    // bookings on hosts that run west of UTC.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || date < istTodayISO()) {
      return NextResponse.json({ message: 'Cannot book for a past date.' }, { status: 400 });
    }

    // 3. Validate all slots — a bookable slot is one 1-hour slot inside the
    // venue's grid (06:00–23:00 IST).
    const parsedSlots = [];
    for (const s of slotList) {
      const times = parseBookableSlot(s);
      if (!times) {
        return NextResponse.json({ message: `Invalid slot: ${s}. Only 1-hour slots between 06:00 and 23:00 can be booked.` }, { status: 400 });
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

    const venue = await Venue.findById(venueId).lean();
    if (!venue) {
      return NextResponse.json({ message: 'Venue not found.' }, { status: 404 });
    }

    const turfCount = turfCountOf(venue.numberOfTurfs);

    // 5. Authorization for Offline
    if (venue.owner.toString() !== authSession.user.id) {
      return NextResponse.json({ message: 'Unauthorized for offline booking.' }, { status: 403 });
    }

    // Generate a groupId if booking multiple slots
    const groupId = slotList.length > 1 ? crypto.randomUUID() : undefined;

    // 6. Process each slot. The slot lock makes two bookings for the same
    // slot collide instead of both passing the capacity check.
    let createdBookings;
    try {
      createdBookings = await runBookingTransaction(async (session) => {
        const lockKeys = [...new Set(parsedSlots.map(
          (times) => slotLockKey(venueId, date, times.startTime, times.endTime)
        ))].sort();
        for (const key of lockKeys) {
          await lockSlot(key, session);
        }

        const created = [];
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

          const allocation = allocateBooking({
            existingBookings,
            playersCount,
            classification,
            turfCount,
            preferredSide: preferredSide === 2 ? 2 : preferredSide === 1 ? 1 : undefined,
          });
          if (allocation.error) {
            const messages = {
              'group-needs-empty': `Slot ${slotList[i]} has no free turf for a Group booking.`,
              'capacity-full': 'No team slot available for this slot.',
            };
            const reason = blockReason(existingBookings, { playersCount, classification });
            throw new BookingError(reason || messages[allocation.error] || 'Slot unavailable.', 409);
          }

          const booking = await Booking.create([{
            venue: venueId,
            user: null,
            date: bookingDate,
            startTime: times.startTime,
            endTime: times.endTime,
            totalAmount: 0,
            commissionPercent: COMMISSION_PERCENT,
            commissionAmount: 0,
            status: 'CONFIRMED',
            bookingType: 'OFFLINE',
            sport,
            classification,
            playersCount,
            teamSide: allocation.assignedSide,
            turf: allocation.turf,
            groupId,
            offlineCustomerName: offlineCustomerName || 'Manual Block',
            offlineCustomerPhone: offlineCustomerPhone || undefined,
          }], { session });

          created.push(booking[0]);
        }

        return created;
      });
    } catch (err) {
      if (err instanceof BookingError) {
        return NextResponse.json({ message: err.message }, { status: err.status });
      }
      throw err;
    }

    const bookingIds = createdBookings.map(b => b._id.toString());

    return NextResponse.json({ 
      bookingId: bookingIds[0], 
      bookingIds,
      slotsBooked: slotList.length,
      turf: createdBookings[0]?.turf,
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/bookings]', error);
    return NextResponse.json({ message: 'Booking failed. Please try again.' }, { status: 500 });
  }
}
