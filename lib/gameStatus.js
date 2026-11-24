import { PLAYERS_PER_SIDE, blockReason } from './capacity';
import { dateToISTDateISO, formatSlotLabel } from './ist';
import { bookingRef } from './bookingRef';

/**
 * Group bookings into per-turf games for the vendor Game Status screen and the
 * admin Games & Matching screen. Pure — the caller supplies the bookings.
 */
const CAPACITY = PLAYERS_PER_SIDE * 2;

export function groupGames({ bookings = [], todayISO = '' } = {}) {
  const groups = new Map();

  for (const b of bookings) {
    const dayISO = b.dateISO || (b.date ? dateToISTDateISO(b.date) : '');
    const turf = Math.max(1, Number(b.turf) || 1);
    const key = `${b.venueId}|${dayISO}|${b.startTime}|${b.endTime}|${turf}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        venueId: b.venueId || null,
        venueName: b.venueName || 'N/A',
        venueCity: b.venueCity || '',
        date: dayISO,
        startTime: b.startTime,
        endTime: b.endTime,
        slot: formatSlotLabel(b.startTime, b.endTime),
        turf,
        players: 0,
        capacity: CAPACITY,
        classifications: new Set(),
        statuses: new Set(),
        roster: [],
      });
    }
    const g = groups.get(key);
    g.players += b.playersCount || 0;
    g.classifications.add(b.classification);
    g.statuses.add(b.status);
    g.roster.push({
      ref: bookingRef(b._id),
      name: b.userName || 'Player',
      playersCount: b.playersCount || 1,
      classification: b.classification,
      status: b.status,
      teamSide: b.teamSide || 1,
    });
  }

  const rows = [...groups.values()].map((g) => {
    const confirmed = g.statuses.has('CONFIRMED');
    const teamBookings = g.roster.filter(p => p.classification === 'TEAM');
    return {
      ...g,
      classifications: [...g.classifications],
      spotsLeft: Math.max(0, CAPACITY - g.players),
      reason: blockReason(teamBookings, { playersCount: 1, classification: 'SOLO' }),
      status: confirmed ? 'CONFIRMED' : 'FILLING',
      active: g.date === todayISO,
    };
  }).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

  const counts = {
    ACTIVE: rows.filter(r => r.active && r.status !== 'CONFIRMED').length,
    FILLING: rows.filter(r => r.status === 'FILLING').length,
    CONFIRMED: rows.filter(r => r.status === 'CONFIRMED').length,
  };
  return { games: rows, counts };
}
