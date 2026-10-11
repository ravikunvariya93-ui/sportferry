import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { getISTDayRange, formatToAMPM, isSlotPast } from '@/lib/ist';
import { cleanupExpiredPayments } from '@/lib/booking-utils';

const emptyTurf = (turf) => ({
  turf, total: 0, team1: 0, team2: 0, hasSolo: false, soloSide: null, team1Slots: [], team2Slots: [],
});

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ message: 'Date parameter is required.' }, { status: 400 });
    }

    await dbConnect();

    // Cleanup expired payments before checking availability
    await cleanupExpiredPayments();

    // Use robust IST timezone range
    const { startUTC, endUTC } = getISTDayRange(date);

    // Fetch all CONFIRMED or PENDING bookings for this venue on the specified date
    let bookings = await Booking.find({
      venue: params.id,
      date: { $gte: startUTC, $lte: endUTC },
      status: { $in: ['PENDING', 'CONFIRMED', 'PAYMENT_PENDING'] },
    })
    .populate('user', 'name')
    .select('startTime endTime status playersCount teamSide classification turf user offlineCustomerName date')
    .lean();

    // Post-filter: drop PENDING bookings whose slot has already started (IST-aware,
    // independent of the server's timezone).
    const now = new Date();
    bookings = bookings.filter(b => {
      if (b.status === 'CONFIRMED') return true;
      if (b.status === 'PENDING') return !isSlotPast(date, b.startTime, now);
      return true; // Keep PAYMENT_PENDING (it will be cleaned up by cleanupExpiredPayments)
    });

    // Group by slot, then by turf within the slot.
    const slotStats = {};

    bookings.forEach(b => {
      const slotKey = `${formatToAMPM(b.startTime)} – ${formatToAMPM(b.endTime)}`;
      if (!slotStats[slotKey]) {
        slotStats[slotKey] = {
          total: 0, team1: 0, team2: 0,
          hasSolo: false, soloSide: null,
          team1Slots: [], team2Slots: [],
          turfs: {},
        };
      }
      const s = slotStats[slotKey];

      const turf = Math.max(1, Number(b.turf) || 1);
      if (!s.turfs[turf]) s.turfs[turf] = emptyTurf(turf);
      const ts = s.turfs[turf];

      const rosterItem = {
        userId: b.user?._id,
        // Public endpoint — never expose walk-in customer names.
        name: b.user?.name || 'Reserved',
        count: b.playersCount,
        type: b.classification,
      };

      const side = b.teamSide === 2 ? 'team2' : 'team1';
      const slotsKey = b.teamSide === 2 ? 'team2Slots' : 'team1Slots';

      s[side] += b.playersCount;
      s[slotsKey].push(rosterItem);
      s.total += b.playersCount;

      ts[side] += b.playersCount;
      ts[slotsKey].push(rosterItem);
      ts.total += b.playersCount;

      if (b.classification === 'SOLO') {
        s.hasSolo = true; s.soloSide = b.teamSide;
        ts.hasSolo = true; ts.soloSide = b.teamSide;
      }
    });

    // Expose each slot's turfs as a sorted array.
    for (const key of Object.keys(slotStats)) {
      slotStats[key].turfs = Object.values(slotStats[key].turfs).sort((a, b) => a.turf - b.turf);
    }

    return NextResponse.json({ slotStats });
  } catch (error) {
    console.error('[GET /api/venues/[id]/availability]', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
