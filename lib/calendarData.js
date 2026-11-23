import { SLOT_LABELS, parseSlot } from './ist';
import { PLAYERS_PER_SIDE, turfCountOf } from './capacity';

/**
 * Day-grid builder shared by the vendor calendar and the admin "Calendar
 * (All Venues)". Pure — the caller supplies the bookings, blocks and turfs.
 */

const TURF_CAPACITY = PLAYERS_PER_SIDE * 2;
const BLOCK_STATUS = { MAINTENANCE: 'BLOCKED', PRIVATE: 'BLOCKED', TOURNAMENT: 'TOURNAMENT' };

/** The status of one turf's slot from the bookings on it. */
export function classifyTurf(bookings) {
  if (!bookings.length) return 'AVAILABLE';
  if (bookings.some(b => b.bookingType === 'OFFLINE')) return 'OFFLINE';
  if (bookings.some(b => b.classification === 'GROUP')) return 'GROUP';
  if (bookings.some(b => b.classification === 'TEAM')) return 'TEAM';
  return 'SOLO';
}

export function buildDayGrid({ venue, date, bookings = [], blocks = [], turfs = [] }) {
  const number = turfCountOf(venue.numberOfTurfs);

  const blockIndex = new Map();
  for (const b of blocks) blockIndex.set(`${b.turf}|${b.startTime}|${b.endTime}`, b.reason);

  const grid = SLOT_LABELS.map((slot) => {
    const times = parseSlot(slot);
    if (!times) return null;
    const cells = [];
    for (let t = 1; t <= number; t++) {
      const turfBookings = bookings.filter(
        (b) => (Number(b.turf) || 1) === t && b.startTime === times.startTime && b.endTime === times.endTime
      );
      const blockReason = blockIndex.get(`${t}|${times.startTime}|${times.endTime}`);
      const status = blockReason ? (BLOCK_STATUS[blockReason] || 'BLOCKED') : classifyTurf(turfBookings);
      const players = turfBookings.reduce((s, b) => s + (b.playersCount || 0), 0);
      cells.push({
        turf: t,
        status,
        players,
        capacity: TURF_CAPACITY,
        detail: turfBookings[0]
          ? (turfBookings[0].bookingType === 'OFFLINE'
              ? (turfBookings[0].offlineCustomerName || 'Offline')
              : turfBookings[0].classification)
          : (blockReason || null),
      });
    }
    return { slot, startTime: times.startTime, endTime: times.endTime, cells };
  }).filter(Boolean);

  return {
    date,
    venue: { id: venue._id.toString(), name: venue.name, numberOfTurfs: number },
    turfs: turfs.map(t => ({ ...t, _id: t._id.toString(), venue: t.venue.toString(), id: t._id.toString() })),
    grid,
  };
}
