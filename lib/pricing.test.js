import { discountPercentOf, discountedPrice, venuePrice } from './pricing';

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
