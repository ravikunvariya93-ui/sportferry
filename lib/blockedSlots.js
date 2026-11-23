import BlockedSlot from '@/models/BlockedSlot';
import { istDateToUTC } from './ist';

/** Set of turf indexes covered by a list of BlockedSlot rows. */
export function turfSetFromBlocks(rows) {
  return new Set((rows || []).map((r) => Number(r.turf)));
}

/** Turf indexes blocked for one venue + date + slot. */
export async function blockedTurfsInSlot(venueId, dateISO, startTime, endTime, session) {
  const query = BlockedSlot.find({
    venue: venueId,
    date: istDateToUTC(dateISO),
    startTime,
    endTime,
  }).select('turf').lean();
  if (session) query.session(session);
  const rows = await query;
  return turfSetFromBlocks(rows);
}

/** True when the given turf is blocked for that venue + date + slot. */
export async function isTurfBlocked(venueId, dateISO, startTime, endTime, turf, session) {
  const blocked = await blockedTurfsInSlot(venueId, dateISO, startTime, endTime, session);
  return blocked.has(Number(turf));
}

/** All blocks for a venue on a date (for the vendor calendar). */
export async function blocksForDate(venueId, dateISO) {
  return BlockedSlot.find({ venue: venueId, date: istDateToUTC(dateISO) }).sort({ startTime: 1, turf: 1 }).lean();
}
