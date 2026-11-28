import { formatNumber, formatINR, formatDayMonth, formatMonthYear } from './format';

describe('display formatting', () => {
  test('formats numbers with Indian digit grouping', () => {
    expect(formatNumber(1234567)).toBe('12,34,567');
    expect(formatNumber(null)).toBe('0');
  });

  test('prefixes rupee amounts without breaking grouping', () => {
    expect(formatINR(25000)).toBe('₹25,000');
    expect(formatINR(undefined)).toBe('₹0');
  });

  test('formats day/month and month/year labels', () => {
    expect(formatDayMonth('2026-11-24T00:00:00Z')).toMatch(/24 Nov/);
    expect(formatMonthYear('2026-11-24T00:00:00Z')).toBe('November 2026');
    expect(formatDayMonth(null)).toBe('');
    expect(formatMonthYear(null)).toBe('');
  });
});
