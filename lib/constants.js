/** Platform commission (percent) deducted from every confirmed online booking. */
export const COMMISSION_PERCENT = 12;

/** Sports a venue/turf may offer. Mirrors the Venue.sportTypes enum. */
export const SPORT_TYPES = ['Box Cricket', 'Football', 'Tennis', 'Badminton', 'Basketball'];

export const CLASSIFICATION_LIMITS = { SOLO: [1, 2], TEAM: [3, 6], GROUP: [12, 12] };

/** Amenities offered in the owner onboarding wizard. */
export const AMENITIES = [
  'Parking',
  'Change Rooms',
  'Restrooms',
  'Showers',
  'Lockers',
  'Spectator Seating',
  'Cafe / Food',
  'Drinking Water',
  'AC Lounge',
  'Wi-Fi',
  'First Aid',
  'EV Charging',
];

/**
 * Peak hours (IST, 24h) with a dedicated hourly rate. A slot whose start falls in
 * this window uses `venue.pricing.peak` (when set) regardless of the day type.
 */
export const PEAK_HOURS = { start: 17, end: 23 };

/** Lifecycle of a venue as it goes through owner onboarding / admin approval. */
export const ONBOARDING_STATUSES = ['DRAFT', 'PENDING', 'DOCUMENTS', 'REVIEW', 'ACTIVE', 'SUSPENDED', 'REJECTED'];

/**
 * Filter for player-facing venue lists — only venues that are live. Venues that
 * predate the onboarding field (no `onboardingStatus`) count as ACTIVE.
 */
export const PUBLIC_VENUE_FILTER = { $or: [{ onboardingStatus: 'ACTIVE' }, { onboardingStatus: { $exists: false } }] };
