import Turf from '@/models/Turf';
import Venue from '@/models/Venue';

/**
 * Turf records for a venue, ordered by their index (1..N). A booking's `turf`
 * field is this index, so capacity/allocation keeps working unchanged.
 */
export async function loadTurfs(venueId, { activeOnly = false } = {}) {
  const query = { venue: venueId };
  if (activeOnly) query.isActive = true;
  return Turf.find(query).sort({ order: 1 }).lean();
}

/** Turf records for many venues at once, grouped by venue id. */
export async function loadTurfsForVenues(venueIds) {
  const rows = await Turf.find({ venue: { $in: venueIds } }).sort({ venue: 1, order: 1 }).lean();
  const byVenue = {};
  for (const t of rows) {
    const key = t.venue.toString();
    (byVenue[key] ||= []).push(t);
  }
  return byVenue;
}

/** The next free turf index (1..N) for a venue. */
export async function nextTurfOrder(venueId) {
  const last = await Turf.findOne({ venue: venueId }).sort({ order: -1 }).select('order').lean();
  return (last?.order || 0) + 1;
}

/**
 * Keep `Venue.numberOfTurfs` equal to the venue's turf count so the capacity
 * model (which reads `numberOfTurfs`) stays correct.
 */
export async function syncVenueTurfCount(venueId) {
  // Count every turf (not just active ones) so the indexes stay contiguous
  // 1..N — capacity/allocation iterates 1..numberOfTurfs.
  const count = await Turf.countDocuments({ venue: venueId });
  const numberOfTurfs = Math.max(1, count);
  await Venue.updateOne({ _id: venueId }, { $set: { numberOfTurfs } });
  return numberOfTurfs;
}

/** Compact `Turf 1 · Box Cricket · 80 × 40 ft` label. */
export function turfLabel(turf) {
  const size = turf?.size?.length && turf?.size?.width
    ? ` · ${turf.size.length} × ${turf.size.width} ${turf.size.unit || 'ft'}`
    : '';
  const sport = turf?.sport ? ` · ${turf.sport}` : '';
  return `${turf?.name || 'Turf'}${size}${sport}`;
}
