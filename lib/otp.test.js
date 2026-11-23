import { generateOtp, hashOtp, otpMatches, otpNotExpired } from '@/lib/otp';

describe('otp', () => {
  it('generates a 6-digit code', () => {
    const code = generateOtp();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('hashes the code and verifies it in constant time', () => {
    const code = '123456';
    const hash = hashOtp(code);
    expect(hash).not.toBe(code);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(otpMatches(hash, code)).toBe(true);
    expect(otpMatches(hash, '654321')).toBe(false);
    expect(otpMatches(hash, '')).toBe(false);
  });

  it('rejects a tampered or malformed hash', () => {
    expect(otpMatches('not-a-hash', '123456')).toBe(false);
  });

  it('expires codes after their deadline', () => {
    const now = new Date('2026-11-21T12:00:00Z');
    expect(otpNotExpired(new Date('2026-11-21T12:05:00Z'), now)).toBe(true);
    expect(otpNotExpired(new Date('2026-11-21T11:59:00Z'), now)).toBe(false);
    expect(otpNotExpired(null, now)).toBe(false);
  });
});
