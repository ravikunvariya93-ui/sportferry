/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Note: this is per-process. On multi-instance/serverless hosting (e.g. Vercel)
 * each instance keeps its own counters, so it dampens abuse rather than fully
 * preventing it. Swap in a shared store (e.g. Upstash Redis) for strong limits.
 */

const buckets = new Map();
const MAX_KEYS = 10000;

/**
 * @returns {{ ok: boolean, remaining: number, retryAfterMs: number }}
 */
export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();

  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: windowMs };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterMs: bucket.resetAt - now };
}

/** Best-effort client IP from proxy headers. */
export function clientIp(request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/** Test helper: clear all counters. */
export function __resetRateLimit() {
  buckets.clear();
}
