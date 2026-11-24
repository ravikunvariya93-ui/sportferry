import { normalizeOffer, rateWithOffers } from '@/lib/offers';

const base = {
  type: 'SPECIAL', title: 'Weekend offer', days: [], startTime: '18:00', endTime: '19:00',
  discountPercent: 20, fixedPrice: 0, validFrom: '2026-11-01', validTo: '2026-12-01', active: true,
};

describe('normalizeOffer', () => {
  it('normalises a valid special offer', () => {
    const { value, error } = normalizeOffer(base, { vendorId: 'v1' });
    expect(error).toBeUndefined();
    expect(value).toMatchObject({ vendor: 'v1', type: 'SPECIAL', discountPercent: 20, active: true });
  });

  it('requires a title and an owner (unless platform)', () => {
    expect(normalizeOffer({ ...base, title: '' }, { vendorId: 'v1' }).error).toMatch(/title/i);
    expect(normalizeOffer(base, {}).error).toMatch(/venue/i);
    expect(normalizeOffer(base, { allowPlatform: true }).value.vendor).toBeNull();
  });

  it('requires days for a recurring schedule', () => {
    expect(normalizeOffer({ ...base, type: 'RECURRING' }, { vendorId: 'v1' }).error).toMatch(/day/i);
  });

  it('validates times and at least one benefit', () => {
    expect(normalizeOffer({ ...base, startTime: '25:00' }, { vendorId: 'v1' }).error).toMatch(/time/i);
    expect(normalizeOffer({ ...base, discountPercent: 0, fixedPrice: 0 }, { vendorId: 'v1' }).error).toMatch(/discount/i);
  });

  it('rejects an end date before the start date', () => {
    expect(normalizeOffer({ ...base, validFrom: '2026-12-01', validTo: '2026-11-01' }, { vendorId: 'v1' }).error).toMatch(/end date/i);
  });
});

describe('rateWithOffers', () => {
  const special = { type: 'SPECIAL', active: true, discountPercent: 20, fixedPrice: 0, startTime: '18:00', endTime: '20:00' };
  const recurring = { type: 'RECURRING', active: true, days: ['Wed'], discountPercent: 0, fixedPrice: 500 };

  it('applies a matching time-window offer and keeps the best price', () => {
    expect(rateWithOffers(1000, [special], '2026-11-24', '18:00')).toBe(800);
    expect(rateWithOffers(1000, [special], '2026-11-24', '16:00')).toBe(1000);
    expect(rateWithOffers(1000, [special, recurring], '2026-11-25', '18:00')).toBe(500);
  });

  it('ignores inactive and out-of-range offers', () => {
    expect(rateWithOffers(1000, [{ ...special, active: false }], '2026-11-24', '18:00')).toBe(1000);
    expect(rateWithOffers(1000, [{ ...special, validFrom: '2026-12-01' }], '2026-11-24', '18:00')).toBe(1000);
  });
});
