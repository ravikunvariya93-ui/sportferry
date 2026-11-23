import { normalizeOnboarding } from '@/lib/onboarding';

const valid = {
  venue: {
    name: 'SkyTurf Arena', city: 'Ahmedabad', area: 'Bopal', address: 'Bopal, Ahmedabad',
    sportTypes: ['Box Cricket', 'Football'], amenities: ['Parking'],
    pricing: { weekday: 1500, weekend: 1800, peak: 2000 }, discountPercent: 5,
  },
  turfs: [
    { name: 'Turf 1', sport: 'Box Cricket', size: { length: 80, width: 40, unit: 'Feet' } },
    { name: 'Turf 2', sport: 'Football', size: { length: 120, width: 80, unit: 'Metres' } },
  ],
  bank: { accountHolderName: 'Amit Shah', bankName: 'SBI', accountNumber: '123', ifsc: 'sbin0001234' },
};

describe('normalizeOnboarding', () => {
  it('normalises a valid submission', () => {
    const { value, error } = normalizeOnboarding(valid);
    expect(error).toBeUndefined();
    expect(value.venue.onboardingStatus).toBe('PENDING');
    expect(value.venue.pricePerHour).toBe(1500); // weekday mirrors pricePerHour
    expect(value.venue.pricing).toEqual({ weekday: 1500, weekend: 1800, peak: 2000 });
    expect(value.turfs).toHaveLength(2);
    expect(value.turfs[1].order).toBe(2);
    expect(value.turfs[0].size.unit).toBe('Feet');
    expect(value.bank.ifsc).toBe('SBIN0001234'); // uppercased
  });

  it('requires venue identity fields', () => {
    expect(normalizeOnboarding({ ...valid, venue: { ...valid.venue, city: '' } }).error)
      .toMatch(/city/i);
  });

  it('requires at least one valid sport', () => {
    expect(normalizeOnboarding({ ...valid, venue: { ...valid.venue, sportTypes: ['Quidditch'] } }).error)
      .toMatch(/sport/i);
  });

  it('requires a positive weekday price', () => {
    const noPrice = { ...valid, venue: { ...valid.venue, pricing: { weekday: 0 } } };
    expect(normalizeOnboarding(noPrice).error).toMatch(/price/i);
  });

  it('requires at least one turf', () => {
    expect(normalizeOnboarding({ ...valid, turfs: [] }).error).toMatch(/turf/i);
  });

  it('rejects a turf without a valid sport', () => {
    const badTurf = { ...valid, turfs: [{ name: 'T1', sport: 'Polo' }] };
    expect(normalizeOnboarding(badTurf).error).toMatch(/turf/i);
  });
});
