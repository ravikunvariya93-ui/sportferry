import crypto from 'crypto';

/** One-time phone verification codes — hashed at rest, verified in constant time. */
export const OTP_TTL_MS = 5 * 60 * 1000;

export function generateOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

export function hashOtp(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

export function otpMatches(hash, code) {
  if (!hash || !code) return false;
  const a = Buffer.from(String(hash), 'hex');
  const b = Buffer.from(hashOtp(code), 'hex');
  return a.length === b.length && a.length === 32 && crypto.timingSafeEqual(a, b);
}

export function otpNotExpired(expires, now = new Date()) {
  return Boolean(expires) && new Date(expires).getTime() > now.getTime();
}
