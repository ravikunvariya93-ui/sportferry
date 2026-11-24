import { CLASSIFICATION_LIMITS } from './constants';
import { istDateToUTC } from './ist';

export function normalizeClassification(value, fallback = 'SOLO') {
  return Object.hasOwn(CLASSIFICATION_LIMITS, value) ? value : fallback;
}

export function normalizePlayersCount(value, fallback = 1) {
  const count = Math.floor(Number(value));
  return Number.isFinite(count) && count >= 1 ? count : fallback;
}

export function classificationLimitError(classification, playersCount) {
  const limits = CLASSIFICATION_LIMITS[classification];
  if (!limits) return 'Invalid classification.';
  const [min, max] = limits;
  if (playersCount < min || playersCount > max) {
    return `${classification} bookings must have ${min}-${max} players.`;
  }
  return null;
}

export function bookingDateFor(dateISO) {
  return istDateToUTC(dateISO);
}
