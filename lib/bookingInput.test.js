import {
  normalizeClassification,
  normalizePlayersCount,
  classificationLimitError,
  bookingDateFor,
} from './bookingInput';

describe('booking input helpers', () => {
  it('normalises classification and player count', () => {
    expect(normalizeClassification('TEAM')).toBe('TEAM');
    expect(normalizeClassification('NOPE')).toBe('SOLO');
    expect(normalizePlayersCount('4')).toBe(4);
    expect(normalizePlayersCount('x')).toBe(1);
  });

  it('shares classification limits across both booking paths', () => {
    expect(classificationLimitError('SOLO', 2)).toBeNull();
    expect(classificationLimitError('TEAM', 7)).toContain('3-6');
    expect(classificationLimitError('GROUP', 6)).toContain('12');
    expect(classificationLimitError('NOPE', 1)).toBe('Invalid classification.');
  });

  it('stores booking dates as UTC midnight for the IST day', () => {
    expect(bookingDateFor('2026-11-24').toISOString()).toBe('2026-11-24T00:00:00.000Z');
  });
});
