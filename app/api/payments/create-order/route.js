import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import User from '@/models/User';
import { auth } from '@/lib/auth';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getISTDayRange, istTodayISO, parseBookableSlot } from '@/lib/ist';
import { cleanupExpiredPayments } from '@/lib/booking-utils';
import { runBookingTransaction, lockSlot, slotLockKey, BookingError } from '@/lib/bookingTransactions';
import { allocateBooking, turfCountOf, blockReason } from '@/lib/capacity';
import { COMMISSION_PERCENT } from '@/lib/constants';
import { discountedPrice } from '@/lib/pricing';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const authSession = await auth();
    if (!authSession) {
      return NextResponse.json({ message: 'You must be logged in to book.' }, { status: 401 });
    }

    const rl = rateLimit(`create-order:${authSession.user.id}`, { limit: 30, windowMs: 10 * 60 * 1000 });
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Too many booking attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json();
    const {
      venueId, date, slots, selections, sport, classification,
      playersCount: rawPlayersCount = 1,
    } = body;

    // Selections may carry per-booking type/players (from "Add More Slots" forms).
    // Legacy callers send one global classification/playersCount for all cells.
    const fallbackClassification = ['SOLO', 'TEAM', 'GROUP'].includes(classification) ? classification : 'SOLO';
    const fallbackPlayers = Math.max(1, Math.floor(Number(rawPlayersCount)) || 1);
    let cells = [];
    if (Array.isArray(selections) && selections.length > 0) {
      cells = selections
        .filter(s => s && s.date && s.slot)
        .map(s => ({
          date: s.date,
          slot: s.slot,
          classification: ['SOLO', 'TEAM', 'GROUP'].includes(s.classification) ? s.classification : fallbackClassification,
          playersCount: Math.max(1, Math.floor(Number(s.playersCount)) || fallbackPlayers),
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

    const venue = await Venue.findById(venueId).lean();
    if (!venue) {
      return NextResponse.json({ message: 'Venue not found.' }, { status: 404 });
    }

    const turfCount = turfCountOf(venue.numberOfTurfs);

    if (!Array.isArray(venue.sportTypes) || !venue.sportTypes.includes(sport)) {
      return NextResponse.json({ message: 'Invalid sport for this venue.' }, { status: 400 });
    }

    // Server-authoritative per-player price, with the venue's discount applied.
    const unitPrice = discountedPrice(venue.pricePerHour, venue.discountPercent);

    // The session doesn't carry the phone number, so read it for the Razorpay prefill.
    const customer = await User.findById(authSession.user.id).select('phone').lean();

    const parsedCells = [];
    const todayISO = istTodayISO();
    for (const c of cells) {
      // A bookable slot is one 1-hour slot inside the venue's grid.
      const times = parseBookableSlot(c.slot);
      if (!times || !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) {
        return NextResponse.json({ message: `Invalid date/slot: ${c.date} ${c.slot}` }, { status: 400 });
      }
      // Past dates are rejected against the IST calendar day, not the
      // server's local midnight (which broke same-day bookings on some hosts).
      if (c.date < todayISO) {
        return NextResponse.json({ message: 'Cannot book for a past date.' }, { status: 400 });
      }
      const [year, month, day] = c.date.split('-').map(Number);
      parsedCells.push({
        ...times,
        slotLabel: c.slot,
        dateStr: c.date,
        classification: c.classification,
        playersCount: c.playersCount,
        preferredSide: c.preferredSide,
        bookingDate: new Date(Date.UTC(year, month - 1, day)),
        ...getISTDayRange(c.date),
      });
    }

    const CLASSIFICATION_LIMITS = { SOLO: [1, 2], TEAM: [3, 6], GROUP: [12, 12] };
    for (const pc of parsedCells) {
      const [min, max] = CLASSIFICATION_LIMITS[pc.classification] || [1, 99];
      if (pc.playersCount < min || pc.playersCount > max) {
        return NextResponse.json(
          { message: `${pc.classification} bookings must have ${min}-${max} players.` },
          { status: 400 }
        );
      }
    }

    const groupId = parsedCells.length > 1 ? crypto.randomUUID() : undefined;
    const totalAmount = parsedCells.reduce((s, pc) => s + unitPrice * pc.playersCount, 0);

    // 1. Create Razorpay Order (fail fast if payments aren't configured).
    //    Created once, outside the booking transaction, so a retry after a
    //    slot race reuses the same order instead of leaving a second one.
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json({ message: 'Payments are not configured.' }, { status: 503 });
    }
    const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });

    const options = {
      amount: totalAmount * 100, // in paisa
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

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
        for (const times of parsedCells) {
          // Capacity Check (Atomic within Transaction) — per date+slot
          const existingBookings = await Booking.find({
            venue: venueId,
            date: { $gte: times.startUTC, $lte: times.endUTC },
            startTime: times.startTime,
            endTime: times.endTime,
            status: { $ne: 'CANCELLED' },
          }).session(session).lean();

          const allocation = allocateBooking({
            existingBookings,
            playersCount: times.playersCount,
            classification: times.classification,
            turfCount,
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

          const commissionAmount = Math.round((unitPrice * times.playersCount) * COMMISSION_PERCENT / 100);

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
      venueName: venue.name,
      customerName: authSession.user.name,
      customerEmail: authSession.user.email,
      customerPhone: customer?.phone || '',
    }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/payments/create-order]', error);
    return NextResponse.json({ message: 'Failed to initiate payment.' }, { status: 500 });
  }
}
