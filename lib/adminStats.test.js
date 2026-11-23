import { fillRatePct, bookingTypeBreakdown, dailyTrend } from '@/lib/adminStats';

describe('fillRatePct', () => {
  it('is a clamped percentage', () => {
    expect(fillRatePct(50, 100)).toBe(50);
    expect(fillRatePct(200, 100)).toBe(100);
    expect(fillRatePct(0, 0)).toBe(0);
  });
});

describe('bookingTypeBreakdown', () => {
  it('counts types and offline, with percentages', () => {
    const b = bookingTypeBreakdown([
      { classification: 'SOLO' }, { classification: 'SOLO' },
      { classification: 'TEAM' }, { classification: 'GROUP' },
      { classification: 'SOLO', bookingType: 'OFFLINE' },
    ]);
    expect(b.total).toBe(5);
    expect(b.solo).toEqual({ count: 2, pct: 40 });
    expect(b.team).toEqual({ count: 1, pct: 20 });
    expect(b.group).toEqual({ count: 1, pct: 20 });
    expect(b.offline).toEqual({ count: 1, pct: 20 });
  });
});

describe('dailyTrend', () => {
  it('returns N buckets with online/offline splits', () => {
    const now = new Date('2026-11-21T12:00:00Z');
    const trend = dailyTrend([
      { createdAt: '2026-11-21T08:00:00Z', bookingType: 'ONLINE' },
      { createdAt: '2026-11-21T09:00:00Z', bookingType: 'OFFLINE' },
      { createdAt: '2026-11-20T09:00:00Z', bookingType: 'ONLINE' },
    ], 2, now);
    expect(trend).toHaveLength(2);
    expect(trend[1]).toMatchObject({ online: 1, offline: 1 });
    expect(trend[0]).toMatchObject({ online: 1, offline: 0 });
  });

  it('buckets by IST day, not UTC (01:30 IST belongs to that IST day)', () => {
    const now = new Date('2026-11-21T12:00:00Z'); // 17:30 IST on 21 Nov
    // 20:00Z on 20 Nov = 01:30 IST on 21 Nov.
    const trend = dailyTrend([{ createdAt: '2026-11-20T20:00:00Z', bookingType: 'ONLINE' }], 2, now);
    expect(trend[1]).toMatchObject({ date: '2026-11-21', online: 1 });
    expect(trend[0]).toMatchObject({ date: '2026-11-20', online: 0 });
  });
});
