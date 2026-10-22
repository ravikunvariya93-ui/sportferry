import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { getISTDayRange, formatToAMPM, isSlotPast } from '@/lib/ist';
import { cleanupExpiredPayments } from '@/lib/booking-utils';
import { auth } from '@/lib/auth';

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const emptyTurf = (turf) => ({
  turf, total: 0, team1: 0, team2: 0, hasSolo: false, soloSide: null, team1Slots: [], team2Slots: [],
  team1Size: null, team2Size: null,
});

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const venueId = params.id;

    if (!date) {
      return NextResponse.json({ message: 'Date parameter is required.' }, { status: 400 });
    }
    if (!OBJECT_ID_RE.test(String(venueId || ''))) {
      return NextResponse.json({ message: 'Invalid venue id.' }, { status: 400 });
    }

    // Anonymous visitors get counts only — never who booked, never their id.
    const session = await auth();
    const isAuthenticated = Boolean(session?.user?.id);

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
        // Public endpoint — never expose who booked or their id to anonymous
        // visitors, and never expose walk-in customer names at all.
        userId: isAuthenticated ? b.user?._id : undefined,
        name: isAuthenticated ? (b.user?.name || 'Reserved') : 'Booked',
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
      if (b.classification === 'TEAM') {
        // Size of the team that owns this side — the opposite side is reserved
        // for a team of the same size.
        ts[b.teamSide === 2 ? 'team2Size' : 'team1Size'] = b.playersCount;
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
