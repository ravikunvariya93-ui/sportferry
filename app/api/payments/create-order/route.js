import { NextResponse } from 'next/server';
import { apiError, tooManyRequests } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import User from '@/models/User';
import { auth } from '@/lib/auth';
import crypto from 'crypto';
import { getISTDayRange, istTodayISO, parseBookableSlot, isSlotPast, isValidDateISO } from '@/lib/ist';
import { cleanupExpiredPayments } from '@/lib/booking-utils';
import { runBookingTransaction, lockSlot, slotLockKey, BookingError } from '@/lib/bookingTransactions';
import { allocateBooking, turfCountOf, blockReason } from '@/lib/capacity';
import { COMMISSION_PERCENT } from '@/lib/constants';
import { hourlyRateFor } from '@/lib/pricing';
import { loadPricedVenue } from '@/lib/venueOffers';
import { blockedTurfsInSlot } from '@/lib/blockedSlots';
import { sharedRateLimit as rateLimit } from '@/lib/rateLimit';
import { getRazorpay, isRazorpayConfigured } from '@/lib/razorpay';
import { commissionOf } from '@/lib/payouts';
import { bookingDateFor, classificationLimitError, normalizeClassification, normalizePlayersCount } from '@/lib/bookingInput';

export async function POST(request) {
  try {
    const authSession = await auth();
    if (!authSession) {
      return NextResponse.json({ message: 'You must be logged in to book.' }, { status: 401 });
    }

    const rl = await rateLimit(`create-order:${authSession.user.id}`, { limit: 30, windowMs: 10 * 60 * 1000 });
    if (!rl.ok) {
      return tooManyRequests('Too many booking attempts. Please try again later.', { retryAfterMs: rl.retryAfterMs });
    }

    const body = await request.json();
    const {
      venueId, date, slots, selections, sport, classification,
      playersCount: rawPlayersCount = 1,
    } = body;

    // Selections may carry per-booking type/players (from "Add More Slots" forms).
    // Legacy callers send one global classification/playersCount for all cells.
    const fallbackClassification = normalizeClassification(classification);
    const fallbackPlayers = normalizePlayersCount(rawPlayersCount);
    let cells = [];
    if (Array.isArray(selections) && selections.length > 0) {
      cells = selections
        .filter(s => s && s.date && s.slot)
        .map(s => ({
          date: s.date,
          slot: s.slot,
          classification: normalizeClassification(s.classification, fallbackClassification),
          playersCount: normalizePlayersCount(s.playersCount, fallbackPlayers),
          preferredSide: s.preferredSide === 2 ? 2 : s.preferredSide === 1 ? 1 : undefined,
        }));
    } else {
      const slotList = Array.isArray(slots) ? slots : [];
      if (venueId && date && slotList.length > 0) {
        cells = slotList.map(slot => ({ date, slot, classification: fallbackClassification, playersCount: fallbackPlayers }));
      }
    }
    if (!venueId || cells.length === 0 || !sport) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }
    if (cells.length > 20) {
      return NextResponse.json({ message: 'Too many slots in a single booking.' }, { status: 400 });
    }

    await dbConnect();

    const pricedVenue = await loadPricedVenue(venueId);
    if (!pricedVenue) {
      return NextResponse.json({ message: 'Venue not found.' }, { status: 404 });
    }

    const turfCount = turfCountOf(pricedVenue.numberOfTurfs);

    if (!Array.isArray(pricedVenue.sportTypes) || !pricedVenue.sportTypes.includes(sport)) {
      return NextResponse.json({ message: 'Invalid sport for this venue.' }, { status: 400 });
    }

    // The session doesn't carry the phone number, so read it for the Razorpay prefill.
    const customer = await User.findById(authSession.user.id).select('phone').lean();

    const parsedCells = [];
    const todayISO = istTodayISO();
    for (const c of cells) {
      // A bookable slot is one 1-hour slot inside the venue's grid.
      const times = parseBookableSlot(c.slot);
      if (!times || !isValidDateISO(c.date)) {
        return NextResponse.json({ message: `Invalid date/slot: ${c.date} ${c.slot}` }, { status: 400 });
      }
      // Past dates are rejected against the IST calendar day, not the
      // server's local midnight (which broke same-day bookings on some hosts).
      if (c.date < todayISO || isSlotPast(c.date, times.startTime)) {
        return NextResponse.json({ message: 'Cannot book a slot that has already started.' }, { status: 400 });
      }
      parsedCells.push({
        ...times,
        slotLabel: c.slot,
        dateStr: c.date,
        classification: c.classification,
        playersCount: c.playersCount,
        preferredSide: c.preferredSide,
        bookingDate: bookingDateFor(c.date),
        ...getISTDayRange(c.date),
      });
    }

    for (const pc of parsedCells) {
      const error = classificationLimitError(pc.classification, pc.playersCount);
      if (error) return NextResponse.json({ message: error }, { status: 400 });
    }

    const groupId = parsedCells.length > 1 ? crypto.randomUUID() : undefined;
    // Server-authoritative per-player price for each cell (weekday/weekend/peak),
    // with the venue's discount applied.
    const totalAmount = parsedCells.reduce(
      (s, pc) => s + hourlyRateFor(pricedVenue, pc.dateStr, pc.startTime) * pc.playersCount,
      0
    );

    // 1. Create Razorpay Order (fail fast if payments aren't configured).
    //    Created once, outside the booking transaction, so a retry after a
    //    slot race reuses the same order instead of leaving a second one.
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    if (!isRazorpayConfigured()) {
      return NextResponse.json({ message: 'Payments are not configured.' }, { status: 503 });
    }
    const razorpay = getRazorpay();

    const options = {
      amount: totalAmount * 100, // in paisa
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    };

    // The order is created only after all slot/capacity checks pass (inside the
    // transaction below), so a 409 does not leave an unpaid Razorpay order.
    let order = null;

    // 2. Create PAYMENT_PENDING bookings (one per date+slot cell).
    //    The slot lock makes two bookings for the same slot collide instead of
    //    both passing the capacity check.
    let createdBookings;
    try {
      createdBookings = await runBookingTransaction(async (session) => {
        await cleanupExpiredPayments(session);

        // Lock every slot this order touches, in a stable order so two
        // multi-slot orders can never deadlock on each other.
        const lockKeys = [...new Set(parsedCells.map(
          (pc) => slotLockKey(venueId, pc.dateStr, pc.startTime, pc.endTime)
        ))].sort();
        for (const key of lockKeys) {
          await lockSlot(key, session);
        }

        const created = [];
        const allocations = [];

        // Validate every cell first — no payment order is created if any slot
        // is full, blocked or reserved for another team.
        for (const times of parsedCells) {
          // Capacity Check (Atomic within Transaction) — per date+slot
          const existingBookings = await Booking.find({
            venue: venueId,
            date: { $gte: times.startUTC, $lte: times.endUTC },
            startTime: times.startTime,
            endTime: times.endTime,
            status: { $ne: 'CANCELLED' },
          }).session(session).lean();

          // Turfs the owner has blocked (maintenance / event) are skipped.
          const blockedTurfs = await blockedTurfsInSlot(venueId, times.dateStr, times.startTime, times.endTime, session);
          const allocation = allocateBooking({
            existingBookings,
            playersCount: times.playersCount,
            classification: times.classification,
            turfCount,
            blockedTurfs,
            preferredSide: times.preferredSide,
          });
          if (allocation.error) {
            const messages = {
              'group-needs-empty': `Slot ${times.dateStr} ${times.slotLabel} has no free turf for a Group booking.`,
              'capacity-full': `No team slot available for ${times.dateStr} ${times.slotLabel}.`,
            };
            const reason = blockReason(existingBookings, {
              playersCount: times.playersCount,
              classification: times.classification,
            });
            throw new BookingError(reason || messages[allocation.error] || 'Slot unavailable.', 409);
          }

          const unitPrice = hourlyRateFor(pricedVenue, times.dateStr, times.startTime);
          const commissionAmount = commissionOf(unitPrice * times.playersCount, COMMISSION_PERCENT);
          allocations.push({ times, allocation, unitPrice, commissionAmount });
        }

        // All slots passed — now ask Razorpay for an order.
        order = await razorpay.orders.create(options);

        for (const { times, allocation, unitPrice, commissionAmount } of allocations) {
          const booking = await Booking.create([{
            venue: venueId,
            user: authSession.user.id,
            date: times.bookingDate,
            startTime: times.startTime,
            endTime: times.endTime,
            totalAmount: unitPrice * times.playersCount,
            commissionPercent: COMMISSION_PERCENT,
            commissionAmount,
            status: 'PAYMENT_PENDING',
            bookingType: 'ONLINE',
            sport,
            classification: times.classification,
            playersCount: times.playersCount,
            teamSide: allocation.assignedSide,
            turf: allocation.turf,
            groupId,
            razorpayOrderId: order.id,
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

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: razorpayKeyId,
      venueName: pricedVenue.name,
      customerName: authSession.user.name,
      customerEmail: authSession.user.email,
      customerPhone: customer?.phone || '',
    }, { status: 201 });

  } catch (error) {
    return apiError(error, 'POST /api/payments/create-order', { message: 'Failed to initiate payment.' });
  }
}
