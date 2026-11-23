import { SPORT_TYPES } from './constants';

/** Round to a non-negative integer, or null when not a usable number. */
const numOrNull = (v) => {
  if (v === null || v === '' || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

const str = (v, max) => String(v ?? '').trim().slice(0, max);

/**
 * Validate + normalise an owner-onboarding submission. Pure — no DB.
 * @returns {{ error: string } | { value: { venue, turfs, bank } }}
 */
export function normalizeOnboarding(body) {
  const venue = body?.venue || {};
  const turfs = Array.isArray(body?.turfs) ? body.turfs : [];
  const bank = body?.bank || {};

  const name = str(venue.name, 60);
  const city = str(venue.city, 80);
  const area = str(venue.area, 80);
  const address = str(venue.address, 200);
  if (!name || !city || !area || !address) {
    return { error: 'Venue name, city, area and address are required.' };
  }

  const sportTypes = (Array.isArray(venue.sportTypes) ? venue.sportTypes : []).filter((s) => SPORT_TYPES.includes(s));
  if (!sportTypes.length) return { error: 'Pick at least one sport.' };

  const pricing = {
    weekday: numOrNull(venue.pricing?.weekday),
    weekend: numOrNull(venue.pricing?.weekend),
    peak: numOrNull(venue.pricing?.peak),
  };
  const weekday = pricing.weekday ?? pricing.weekend;
  if (!weekday || weekday <= 0) return { error: 'A weekday price is required.' };

  if (!turfs.length) return { error: 'Add at least one turf or court.' };
  for (const t of turfs) {
    if (!str(t?.name, 60) || !SPORT_TYPES.includes(t?.sport)) {
      return { error: 'Every turf needs a name and a valid sport.' };
    }
  }

  return {
    value: {
      venue: {
        name,
        city,
        area,
        address,
        sportTypes,
        amenities: (Array.isArray(venue.amenities) ? venue.amenities : []).map((a) => str(a, 40)).filter(Boolean).slice(0, 30),
        images: (Array.isArray(venue.images) ? venue.images : []).filter(Boolean).slice(0, 6),
        discountPercent: Math.min(90, Math.max(0, Math.round(Number(venue.discountPercent)) || 0)),
        pricing,
        pricePerHour: weekday,
        documents: {
          businessIdProof: str(venue.documents?.businessIdProof, 500),
          businessProof: str(venue.documents?.businessProof, 500),
          venueProof: str(venue.documents?.venueProof, 500),
        },
        onboardingStatus: 'PENDING',
      },
      turfs: turfs.map((t, i) => ({
        name: str(t.name, 60),
        sport: t.sport,
        size: {
          length: Math.max(0, Math.floor(Number(t.size?.length)) || 0),
          width: Math.max(0, Math.floor(Number(t.size?.width)) || 0),
          unit: ['Feet', 'Metres'].includes(t.size?.unit) ? t.size.unit : 'Feet',
        },
        surface: str(t.surface, 40) || 'Synthetic Turf',
        playingFormat: str(t.playingFormat, 40),
        lighting: t.lighting !== false,
        order: i + 1,
      })),
      bank: {
        accountHolderName: str(bank.accountHolderName, 80),
        bankName: str(bank.bankName, 80),
        accountNumber: str(bank.accountNumber, 40),
        ifsc: str(bank.ifsc, 20).toUpperCase(),
      },
    },
  };
}
