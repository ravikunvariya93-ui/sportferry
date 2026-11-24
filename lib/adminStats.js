/**
 * Dashboard aggregates for the admin overview. Pure — no DB.
 */

import { IST_OFFSET_MS, dateToISTDateISO } from './ist';

export { commissionOf } from './payouts';

/** Percentage of a venue's monthly player capacity that was actually used. */
export function fillRatePct(players, capacity) {
  const cap = Number(capacity) || 0;
  if (cap <= 0) return 0;
  return Math.min(100, Math.round(((Number(players) || 0) / cap) * 100));
}

/** Counts + percentages of bookings by game type. */
export function bookingTypeBreakdown(bookings = []) {
  let solo = 0, team = 0, group = 0, offline = 0;
  for (const b of bookings) {
    if (b.bookingType === 'OFFLINE') { offline += 1; continue; }
    if (b.classification === 'GROUP') group += 1;
    else if (b.classification === 'TEAM') team += 1;
    else solo += 1;
  }
  const total = solo + team + group + offline;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  return {
    total,
    solo: { count: solo, pct: pct(solo) },
    team: { count: team, pct: pct(team) },
    group: { count: group, pct: pct(group) },
    offline: { count: offline, pct: pct(offline) },
  };
}

/** IST calendar day (YYYY-MM-DD) for a Date. */
export function istDateKey(date) {
  return dateToISTDateISO(date);
}

/**
 * Last N IST days of online vs offline booking counts (by createdAt date).
 * IST, not UTC — a booking at 01:30 IST belongs to that IST day, not the
 * previous UTC one.
 */
export function dailyTrend(bookings = [], days = 30, now = new Date()) {
  const out = [];
  const nowIst = new Date(now.getTime() + IST_OFFSET_MS);
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(nowIst.getTime() - i * 86400000);
    const key = day.toISOString().slice(0, 10);
    const [y, m, d] = key.split('-').map(Number);
    const dayBookings = bookings.filter(b => b.createdAt && istDateKey(b.createdAt) === key);
    out.push({
      date: key,
      label: new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      online: dayBookings.filter(b => b.bookingType !== 'OFFLINE').length,
      offline: dayBookings.filter(b => b.bookingType === 'OFFLINE').length,
    });
  }
  return out;
}
