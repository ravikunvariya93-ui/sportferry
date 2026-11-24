/** Validation + normalisation for recurring schedules and special offers. */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function normalizeOffer(body, { vendorId = null, allowPlatform = false } = {}) {
  const type = body?.type;
  if (!['RECURRING', 'SPECIAL'].includes(type)) return { error: 'Choose Recurring or Special.' };

  const title = String(body.title || '').trim().slice(0, 80);
  if (!title) return { error: 'A title is required.' };

  if (vendorId === null && !allowPlatform) return { error: 'A venue is required.' };

  const days = (Array.isArray(body.days) ? body.days : []).filter(d => DAYS.includes(d));
  const startTime = String(body.startTime || '');
  const endTime = String(body.endTime || '');
  if (startTime && !TIME_RE.test(startTime)) return { error: 'Invalid start time.' };
  if (endTime && !TIME_RE.test(endTime)) return { error: 'Invalid end time.' };
  if (type === 'RECURRING' && !days.length) return { error: 'Pick at least one day.' };

  const discountPercent = Math.min(90, Math.max(0, Math.round(Number(body.discountPercent)) || 0));
  const fixedPrice = Math.max(0, Math.round(Number(body.fixedPrice)) || 0);
  if (!discountPercent && !fixedPrice) return { error: 'Set a discount or a fixed price.' };

  const asDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const validFrom = asDate(body.validFrom);
  const validTo = asDate(body.validTo);
  if (body.validFrom && !validFrom) return { error: 'Invalid start date.' };
  if (body.validTo && !validTo) return { error: 'Invalid end date.' };
  if (validFrom && validTo && validTo < validFrom) return { error: 'End date must be after start date.' };

  return {
    value: {
      vendor: vendorId,
      type,
      title,
      days,
      startTime,
      endTime,
      discountPercent,
      fixedPrice,
      validFrom,
      validTo,
      active: body.active !== false,
    },
  };
}

export { DAYS as OFFER_DAYS };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayStamp = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

/**
 * Best price for one slot from the venue's active recurring/special offers.
 * Returns the base rate unchanged when no offer matches.
 */
export function rateWithOffers(baseRate, offers = [], dateISO = '', startTime = '') {
  if (!Array.isArray(offers) || offers.length === 0) return baseRate;
  const weekday = WEEKDAYS[new Date(`${dateISO}T00:00:00Z`).getUTCDay()];
  let best = baseRate;

  for (const offer of offers) {
    if (offer.active === false) continue;
    const from = dayStamp(offer.validFrom);
    const to = dayStamp(offer.validTo);
    if ((from && dateISO < from) || (to && dateISO > to)) continue;
    if (offer.type === 'RECURRING' && !offer.days?.includes(weekday)) continue;
    if (offer.startTime && startTime < offer.startTime) continue;
    if (offer.endTime && startTime >= offer.endTime) continue;

    const fixed = Number(offer.fixedPrice) || 0;
    const percent = Number(offer.discountPercent) || 0;
    const price = fixed > 0 ? fixed : Math.round(baseRate * (100 - percent) / 100);
    if (price < best) best = price;
  }

  return best;
}
