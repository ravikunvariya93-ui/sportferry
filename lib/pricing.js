/**
 * Venue pricing helpers — pure, safe for client and server.
 *
 * A venue may run a percentage discount on its per-player hourly rate. The
 * server ALWAYS recomputes the payable amount from these helpers, so client
 * values can never affect what is charged.
 */

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
