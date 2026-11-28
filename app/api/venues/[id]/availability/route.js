import { NextResponse } from 'next/server';
import { apiError, badRequest } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { getISTDayRange, formatToAMPM, isSlotPast, isValidDateISO } from '@/lib/ist';
import { cleanupExpiredPayments } from '@/lib/booking-utils';
import { blocksForDate } from '@/lib/blockedSlots';
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

    if (!isValidDateISO(date)) {
      return badRequest('A valid date (YYYY-MM-DD) is required.');
    }
    if (!OBJECT_ID_RE.test(String(venueId || ''))) {
      return badRequest('Invalid venue id.');
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

    // Post-filter: drop every hold whose slot has already started (IST-aware).
    // Confirmed bookings stay visible as history; stale PAYMENT_PENDING holds
    // must not keep a past slot looking occupied.
    const now = new Date();
    bookings = bookings.filter(b => {
      if (b.status === 'CONFIRMED') return true;
      return !isSlotPast(date, b.startTime, now);
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

    // Slot labels are keyed by the same "hh:mm AM/PM – hh:mm AM/PM" format.
    const slotKey = (start, end) => `${formatToAMPM(start)} \u2013 ${formatToAMPM(end)}`;

    // Overlay owner blocks (maintenance / events) so no channel offers them.
    const blocks = await blocksForDate(params.id, date);
    for (const block of blocks) {
      const key = slotKey(block.startTime, block.endTime);
      if (!slotStats[key]) {
        slotStats[key] = { total: 0, team1: 0, team2: 0, hasSolo: false, soloSide: null, team1Slots: [], team2Slots: [], turfs: [] };
      }
      const s = slotStats[key];
      let ts = s.turfs.find(t => t.turf === block.turf);
      if (!ts) { ts = emptyTurf(block.turf); s.turfs.push(ts); }
      ts.blocked = true;
      ts.blockReason = block.reason;
    }

    // Expose each slot's turfs as a sorted array.
    for (const key of Object.keys(slotStats)) {
      slotStats[key].turfs = Object.values(slotStats[key].turfs).sort((a, b) => a.turf - b.turf);
    }

    return NextResponse.json({ slotStats });
  } catch (error) {
    return apiError(error, 'GET /api/venues/[id]/availability', { message: 'Internal server error.' });
  }
}
