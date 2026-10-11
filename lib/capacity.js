/**
 * Turf capacity model.
 *
 * One turf hosts one match at a time: 6 players per side (Team A / Team B).
 * A venue with N turfs can run N independent matches per 1-hour slot, so each
 * booking is assigned to a specific `turf` AND a `teamSide`.
 *
 * Pure module (no DB imports).
 */

export const PLAYERS_PER_SIDE = 6;

export function turfCountOf(numberOfTurfs) {
  return Math.max(1, Math.floor(Number(numberOfTurfs)) || 1);
}

/** Total players a slot can hold across all turfs (6 per side × 2 sides × turfs). */
export function slotCapacityFor(numberOfTurfs) {
  return 2 * PLAYERS_PER_SIDE * turfCountOf(numberOfTurfs);
}

const turfOf = (b) => Math.max(1, Number(b.turf) || 1);

/** Which side (within a single turf) a booking fits on, or null if none. */
function sideFor({ team1, team2, hasSolo1, hasSolo2 }, playersCount, classification) {
  if (classification === 'SOLO') {
    if (hasSolo2 && team2 < PLAYERS_PER_SIDE) return 2;
    if (hasSolo1 && team1 < PLAYERS_PER_SIDE) return 1;
    if (team2 > 0 && team2 < PLAYERS_PER_SIDE && !hasSolo1) return 1;
    if (team1 < PLAYERS_PER_SIDE) return 1;
    if (team2 < PLAYERS_PER_SIDE) return 2;
    return null;
  }
  if (team1 + playersCount <= PLAYERS_PER_SIDE) return 1;
  if (team2 + playersCount <= PLAYERS_PER_SIDE) return 2;
  return null;
}

/**
 * Place a booking on the first turf that has room on a valid side.
 *
 * @returns {{ turf: number, assignedSide: 1|2 } | { error: 'group-needs-empty'|'capacity-full' }}
 */
export function allocateBooking({ existingBookings, playersCount, classification, turfCount }) {
  const turfs = turfCountOf(turfCount);

  if (classification === 'GROUP') {
    // A group match takes a whole turf — find an empty one.
    for (let t = 1; t <= turfs; t++) {
      if (!existingBookings.some(b => turfOf(b) === t)) return { turf: t, assignedSide: 1 };
    }
    return { error: 'group-needs-empty' };
  }

  for (let t = 1; t <= turfs; t++) {
    const list = existingBookings.filter(b => turfOf(b) === t);
    const team1 = list.filter(b => b.teamSide === 1).reduce((s, b) => s + b.playersCount, 0);
    const team2 = list.filter(b => b.teamSide === 2).reduce((s, b) => s + b.playersCount, 0);
    const hasSolo1 = list.some(b => b.teamSide === 1 && b.classification === 'SOLO');
    const hasSolo2 = list.some(b => b.teamSide === 2 && b.classification === 'SOLO');
    const side = sideFor({ team1, team2, hasSolo1, hasSolo2 }, playersCount, classification);
    if (side) return { turf: t, assignedSide: side };
  }

  return { error: 'capacity-full' };
}
