/**
 * Fixed-window rate limiting. API routes use `sharedRateLimit` (MongoDB-backed,
 * shared across instances); `rateLimit` stays an in-memory implementation for
 * isolated unit tests and callers without a database.
 */

const buckets = new Map();
const MAX_KEYS = 10000;

/**
 * Shared fixed-window limiter backed by MongoDB. One atomic pipeline update
 * resets an expired window or increments the live one, so every serverless
 * instance sees the same counter.
 * @returns {Promise<{ ok: boolean, remaining: number, retryAfterMs: number }>}
 */
export async function sharedRateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const mongoose = (await import('mongoose')).default;
  const { default: dbConnect } = await import('./mongodb');
  await dbConnect();
  const collection = mongoose.connection.db.collection('ratelimits');
  const doc = await collection.findOneAndUpdate(
    { _id: key },
    [{
      $set: {
        count: { $cond: [{ $lte: ['$resetAt', now] }, 1, { $add: ['$count', 1] }] },
        resetAt: { $cond: [{ $lte: ['$resetAt', now] }, now + windowMs, '$resetAt'] },
        updatedAt: now,
      },
    }],
    { upsert: true, new: true }
  );
  const count = Number(doc?.count || 1);
  const resetAt = Number(doc?.resetAt || now + windowMs);
  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterMs: Math.max(0, resetAt - now),
  };
}

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
