import {
  discountPercentOf, discountedPrice, venuePrice,
  hourlyRateFor, baseHourlyRateFor, isPeakSlot, isWeekend, displayPriceFor,
} from './pricing';

describe('discountPercentOf', () => {
  test('normalises, clamps to 0–90 and defaults to 0', () => {
    expect(discountPercentOf({ discountPercent: 20 })).toBe(20);
    expect(discountPercentOf({ discountPercent: '15' })).toBe(15);
    expect(discountPercentOf({ discountPercent: 250 })).toBe(90);
    expect(discountPercentOf({ discountPercent: -5 })).toBe(0);
    expect(discountPercentOf({})).toBe(0);
    expect(discountPercentOf(null)).toBe(0);
  });
});

describe('discountedPrice', () => {
  test('applies the percent and rounds to the rupee', () => {
    expect(discountedPrice(1000, 20)).toBe(800);
    expect(discountedPrice(1600, 25)).toBe(1200);
    expect(discountedPrice(999, 10)).toBe(899);
    expect(discountedPrice(0, 50)).toBe(0);
  });
  test('clamps the discount to 0–90', () => {
    expect(discountedPrice(1000, 200)).toBe(100);
    expect(discountedPrice(1000, -10)).toBe(1000);
  });
});

describe('venuePrice', () => {
  test('returns the discounted per-hour rate', () => {
    expect(venuePrice({ pricePerHour: 1600, discountPercent: 25 })).toBe(1200);
    expect(venuePrice({ pricePerHour: 1600 })).toBe(1600);
  });
});

describe('hourlyRateFor — day type and peak', () => {
  const venue = { pricePerHour: 1000, discountPercent: 0, pricing: { weekday: 1000, weekend: 1500, peak: 1800 } };

  test('weekday uses the weekday rate', () => {
    // 2026-11-18 is a Wednesday.
    expect(baseHourlyRateFor(venue, '2026-11-18', '10:00')).toBe(1000);
  });

  test('weekend uses the weekend rate', () => {
    // 2026-11-21 is a Saturday.
    expect(baseHourlyRateFor(venue, '2026-11-21', '10:00')).toBe(1500);
  });

  test('peak wins over the day type', () => {
    expect(baseHourlyRateFor(venue, '2026-11-18', '19:00')).toBe(1800);
    expect(baseHourlyRateFor(venue, '2026-11-21', '19:00')).toBe(1800);
  });

  test('falls back to pricePerHour when tiers are unset', () => {
    expect(baseHourlyRateFor({ pricePerHour: 800, pricing: {} }, '2026-11-21', '10:00')).toBe(800);
  });

  test('falls back to weekday when the weekend rate is unset', () => {
    expect(baseHourlyRateFor({ pricePerHour: 800, pricing: { weekday: 900 } }, '2026-11-21', '10:00')).toBe(900);
  });

  test('applies the discount to the effective rate', () => {
    const v = { pricePerHour: 1000, discountPercent: 10, pricing: { weekday: 1000, weekend: 1500 } };
    expect(hourlyRateFor(v, '2026-11-18', '10:00')).toBe(900);
    expect(hourlyRateFor(v, '2026-11-21', '10:00')).toBe(1350);
  });

  test('detects peak and weekend boundaries', () => {
    expect(isPeakSlot('2026-11-18', '17:00')).toBe(true);
    expect(isPeakSlot('2026-11-18', '16:00')).toBe(false);
    expect(isWeekend('2026-11-21')).toBe(true);
    expect(isWeekend('2026-11-18')).toBe(false);
  });
});

describe('displayPriceFor', () => {
  test('returns the effective rate, base rate and discount for a slot', () => {
    const v = { pricePerHour: 1000, pricing: { weekday: 1000 }, discountPercent: 20 };
    expect(displayPriceFor(v, '2026-11-18', '10:00')).toEqual({ finalPrice: 800, basePrice: 1000, discountPct: 20 });
  });

  test('takes the cheapest rate across the day when no slot is given', () => {
    const v = {
      pricePerHour: 1000,
      pricing: { weekday: 1000, peak: 2000 },
      offers: [{ type: 'SPECIAL', active: true, discountPercent: 30 }],
    };
    expect(displayPriceFor(v, '2026-11-18').finalPrice).toBe(700);
  });
});
