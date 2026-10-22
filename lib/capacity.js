/**
 * Turf capacity model.
 *
 * One turf hosts one match at a time: 6 players per side (Team A / Team B).
 * A venue with N turfs can run N independent matches per 1-hour slot, so each
 * booking is assigned to a specific `turf` AND a `teamSide`.
 *
 * A TEAM booking is a team match, not a seat fill:
 *  - a team owns its side — nothing else joins it,
 *  - the opponent on the opposite side must have the same size (3v3, 4v4 …),
 *  - a team always takes a clean side, never one shared with individuals.
 *
 * Pure module (no DB imports) — imported by the booking APIs and by the
 * booking UIs, so client and server run the exact same allocation.
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
const sideOf = (b) => (b.teamSide === 2 ? 2 : 1);

/** Bookings on one side of a turf, plus the team that owns it (if any). */
function sideState(bookings, side) {
  const onSide = bookings.filter((b) => sideOf(b) === side);
  const team = onSide.find((b) => b.classification === 'TEAM') || null;
  return {
    count: onSide.reduce((s, b) => s + (Number(b.playersCount) || 0), 0),
    teamSize: team ? Number(team.playersCount) || 0 : null,
    clean: onSide.length === 0,
  };
}

/**
 * Sides of a turf a TEAM of `playersCount` may take, best first.
 * Empty when this turf cannot host a team of that size.
 */
function teamSideCandidates(bookings, playersCount) {
  const side1 = sideState(bookings, 1);
  const side2 = sideState(bookings, 2);

  // The opposite team: a team of the same size already waits on the other side.
  if (side1.teamSize === playersCount && side2.clean) return [2];
  if (side2.teamSize === playersCount && side1.clean) return [1];

  // A team of a different size owns the turf — only its own size may face it.
  if (side1.teamSize !== null || side2.teamSize !== null) return [];

  // No team here yet: take a clean side and leave the individuals where they are.
  if (side1.clean) return [1];
  if (side2.clean) return [2];
  return [];
}

/**
 * Sides of a turf an individual booking may take, best first.
 * A side is open while it holds no team and is not the side reserved for the
 * opposite team.
 */
function soloSideCandidates(bookings, playersCount) {
  const side1 = sideState(bookings, 1);
  const side2 = sideState(bookings, 2);

  const open = (side, opposite) =>
    side.teamSize === null &&
    !(side.clean && opposite.teamSize !== null) &&
    side.count + playersCount <= PLAYERS_PER_SIDE;

  const candidates = [];
  if (open(side2, side1) && side2.count > 0) candidates.push(2);
  if (open(side1, side2) && side1.count > 0) candidates.push(1);
  if (open(side1, side2) && !candidates.includes(1)) candidates.push(1);
  if (open(side2, side1) && !candidates.includes(2)) candidates.push(2);
  return candidates;
}

/**
 * Place a booking on the first turf that has room on a valid side.
 *
 * `preferredSide` (1 or 2) is a soft preference: it only breaks ties between
 * sides the booking could legally take.
 *
 * @returns {{ turf: number, assignedSide: 1|2 } | { error: 'group-needs-empty'|'capacity-full' }}
 */
export function allocateBooking({ existingBookings, playersCount, classification, turfCount, preferredSide }) {
  const turfs = turfCountOf(turfCount);

  if (classification === 'GROUP') {
    // A group match takes a whole turf — find an empty one.
    for (let t = 1; t <= turfs; t++) {
      if (!existingBookings.some((b) => turfOf(b) === t)) return { turf: t, assignedSide: 1 };
    }
    return { error: 'group-needs-empty' };
  }

  const preferred = preferredSide === 2 ? 2 : preferredSide === 1 ? 1 : null;

  for (let t = 1; t <= turfs; t++) {
    const list = existingBookings.filter((b) => turfOf(b) === t);
    const candidates = classification === 'TEAM'
      ? teamSideCandidates(list, playersCount)
      : soloSideCandidates(list, playersCount);
    if (candidates.length === 0) continue;
    const side = preferred && candidates.includes(preferred) ? preferred : candidates[0];
    return { turf: t, assignedSide: side };
  }

  return { error: 'capacity-full' };
}

/**
 * Rebuild the per-booking list of a slot from the availability API stats, so
 * clients can run the server's allocation locally.
 */
export function existingFromSlotStats(slotStat) {
  if (!slotStat || !Array.isArray(slotStat.turfs)) return [];
  const out = [];
  for (const ts of slotStat.turfs) {
    for (const r of ts.team1Slots || []) {
      out.push({ playersCount: r.count || 1, classification: r.type || 'SOLO', teamSide: 1, turf: ts.turf });
    }
    for (const r of ts.team2Slots || []) {
      out.push({ playersCount: r.count || 1, classification: r.type || 'SOLO', teamSide: 2, turf: ts.turf });
    }
  }
  return out;
}

/**
 * Seats an individual booking could still take in a slot.
 *
 * A team owns its side, and the side opposite a team is reserved for the
 * opposing team — so those seats are not open. Advertising them would send a
 * player to a booking the server rejects with 409.
 *
 * @param {object} args
 * @param {Array} args.bookings Bookings in this slot ({turf, teamSide, playersCount, classification}).
 * @param {number} args.turfCount Turfs the venue has.
 * @returns {number} Open seats for an individual.
 */
export function openSeatsFor({ bookings, turfCount }) {
  const turfs = turfCountOf(turfCount);
  let open = 0;

  for (let t = 1; t <= turfs; t++) {
    const list = (bookings || []).filter((b) => turfOf(b) === t);
    const side1 = sideState(list, 1);
    const side2 = sideState(list, 2);

    const side1Open = !side1.teamSize && !(side1.clean && side2.teamSize !== null);
    const side2Open = !side2.teamSize && !(side2.clean && side1.teamSize !== null);
    if (side1Open) open += PLAYERS_PER_SIDE - side1.count;
    if (side2Open) open += PLAYERS_PER_SIDE - side2.count;
  }

  return Math.max(0, open);
}

/**
 * Why a slot cannot take a booking, in words. Null when the slot holds no
 * team, i.e. the plain "full" case.
 */
export function blockReason(existingBookings, { playersCount, classification }) {
  const sizes = [...new Set(
    (existingBookings || [])
      .filter((b) => b.classification === 'TEAM')
      .map((b) => Number(b.playersCount) || 0),
  )].sort((a, b) => a - b);
  if (sizes.length === 0) return null;

  const label = sizes.length === 1
    ? `${sizes[0]}-player`
    : `${sizes.slice(0, -1).join(', ')} or ${sizes[sizes.length - 1]}-player`;
  if (classification === 'TEAM') {
    return `This slot is reserved for a ${label} team. Both teams must be the same size.`;
  }
  return `This slot is reserved for the opposing ${label} team.`;
}
