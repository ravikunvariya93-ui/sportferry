/**
 * Venue pricing helpers — pure, safe for client and server.
 *
 * A venue may run a percentage discount on its per-player hourly rate. The
 * server ALWAYS recomputes the payable amount from these helpers, so client
 * values can never affect what is charged.
 *
 * A venue can also price by day type and time of day:
 *   peak (evening, PEAK_HOURS) > weekend > weekday.
 * `pricing.weekday` mirrors the legacy `pricePerHour`; any tier left unset
 * falls back to the weekday rate.
 */

import { PEAK_HOURS } from './constants';
import { istDateToUTC } from './ist';
import { rateWithOffers } from './offers';

export const MAX_DISCOUNT_PERCENT = 90;

/** A venue's discount, normalised to an integer 0–90. */
export function discountPercentOf(venue) {
  const d = Math.round(Number(venue?.discountPercent) || 0);
  return Math.min(MAX_DISCOUNT_PERCENT, Math.max(0, d));
}

/** A price after a percent discount (rounded to the nearest rupee). */
export function discountedPrice(price, discountPercent) {
  const p = Number(price) || 0;
  const d = Math.min(MAX_DISCOUNT_PERCENT, Math.max(0, Number(discountPercent) || 0));
  return Math.round((p * (100 - d)) / 100);
}

/** A venue's effective per-player hourly price (with its discount applied). */
export function venuePrice(venue) {
  return discountedPrice(venue?.pricePerHour, discountPercentOf(venue));
}

/** True when an IST (date, "HH:mm") slot starts inside the peak window. */
export function isPeakSlot(dateISO, startTime) {
  const hour = Number(String(startTime || '').split(':')[0]);
  if (!Number.isFinite(hour)) return false;
  return hour >= PEAK_HOURS.start && hour < PEAK_HOURS.end;
}

/** True when the IST calendar date falls on a weekend (Sat/Sun). */
export function isWeekend(dateISO) {
  const day = istDateToUTC(dateISO).getUTCDay();
  return day === 0 || day === 6;
}

/** The venue's undiscounted hourly rate for a date+slot (peak > weekend > weekday). */
export function baseHourlyRateFor(venue, dateISO, startTime) {
  const pricing = venue?.pricing || {};
  const weekday = Number(pricing.weekday ?? venue?.pricePerHour) || 0;
  const weekend = Number(pricing.weekend ?? weekday) || 0;
  const peak = Number(pricing.peak) || 0;

  if (peak > 0 && isPeakSlot(dateISO, startTime)) return peak;
  return isWeekend(dateISO) ? weekend : weekday;
}

/** The venue's effective hourly rate for a date+slot, discount applied. */
export function hourlyRateFor(venue, dateISO, startTime) {
  const rate = discountedPrice(baseHourlyRateFor(venue, dateISO, startTime), discountPercentOf(venue));
  return rateWithOffers(rate, venue?.offers, dateISO, startTime);
}
