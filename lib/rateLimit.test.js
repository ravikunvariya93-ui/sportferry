import { rateLimit, __resetRateLimit } from '@/lib/rateLimit';

describe('rateLimit', () => {
  beforeEach(() => __resetRateLimit());
  afterEach(() => jest.useRealTimers());

  it('allows up to the limit then blocks', () => {
    const opts = { limit: 3, windowMs: 1000 };
    expect(rateLimit('k', opts).ok).toBe(true);
    expect(rateLimit('k', opts).ok).toBe(true);
    expect(rateLimit('k', opts).ok).toBe(true);
    const blocked = rateLimit('k', opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('tracks keys independently', () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(rateLimit('a', opts).ok).toBe(true);
    expect(rateLimit('b', opts).ok).toBe(true);
    expect(rateLimit('a', opts).ok).toBe(false);
  });

  it('resets after the window elapses', () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    const opts = { limit: 1, windowMs: 1000 };
    expect(rateLimit('t', opts).ok).toBe(true);
    expect(rateLimit('t', opts).ok).toBe(false);
    jest.setSystemTime(1001);
    expect(rateLimit('t', opts).ok).toBe(true);
  });
});
