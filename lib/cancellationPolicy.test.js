import {
  calculateRefund,
  getPlayerCancellationTier,
  hoursUntilSlot,
} from '@/lib/cancellationPolicy';

/**
 * Booking slot: 18:00 IST on 2099-01-10  ==  2099-01-10T12:30:00.000Z
 * (IST is UTC+5:30). We pin `now` explicitly in every test so the tiers are
 * deterministic and independent of wall-clock time.
 */

const SLOT_DATE = new Date('2099-01-10T00:00:00.000Z'); // midnight UTC == 05:30 IST
const SLOT_START_ISO = '2099-01-10T12:30:00.000Z'; // 18:00 IST in UTC
const booking = {
  date: SLOT_DATE,
  startTime: '18:00',
  endTime: '19:00',
  totalAmount: 1000,
  bookingType: 'ONLINE',
  classification: 'SOLO',
  playersCount: 1,
};

function build(now) {
  return { ...booking, now };
}

describe('hoursUntilSlot (IST-aware)', () => {
  it('returns a positive number when the slot is in the future', () => {
    const now = new Date('2099-01-08T00:00:00.000Z'); // ~36.5h before slot
    expect(hoursUntilSlot(booking, now)).toBeGreaterThan(0);
  });

  it('returns a negative number when the slot has passed', () => {
    const now = new Date('2099-01-10T18:00:00.000Z'); // 1.5h after the 12:30 UTC start
    expect(hoursUntilSlot(booking, now)).toBeLessThan(0);
  });
});

describe('getPlayerCancellationTier', () => {
  it('grants 100% refund when >= 24h remain', () => {
    const now = new Date('2099-01-08T00:00:00.000Z'); // ~36.5h before
    const tier = getPlayerCancellationTier(booking, now);
    expect(tier.blocked).toBe(false);
    expect(tier.refundPercent).toBe(100);
    expect(tier.tag).toBe('FREE_CANCELLATION');
  });

  it('grants 50% refund when 12–24h remain', () => {
    const now = new Date('2099-01-09T13:00:00.000Z'); // ~23.5h before slot at 12:30 UTC Jan 10
    const tier = getPlayerCancellationTier(booking, now);
    expect(tier.blocked).toBe(false);
    expect(tier.refundPercent).toBe(50);
    expect(tier.tag).toBe('LATE_CANCELLATION');
  });

  it('grants 0% refund when < 12h remain', () => {
    const now = new Date('2099-01-10T07:00:00.000Z'); // ~5.5h before slot
    const tier = getPlayerCancellationTier(booking, now);
    expect(tier.blocked).toBe(false);
    expect(tier.refundPercent).toBe(0);
    expect(tier.tag).toBe('NO_REFUND');
  });

  it('blocks cancellation once the slot has started', () => {
    const now = new Date('2099-01-10T13:00:00.000Z'); // after slot start
    const tier = getPlayerCancellationTier(booking, now);
    expect(tier.blocked).toBe(true);
    expect(tier.tag).toBe('BLOCKED');
  });
});

describe('calculateRefund', () => {
  it('returns the player-tier refund (100% for far-future slot)', () => {
    const now = new Date('2099-01-08T00:00:00.000Z');
    const r = calculateRefund(booking, 'PLAYER', now);
    expect(r.refundPercent).toBe(100);
    expect(r.refundAmount).toBe(1000);
    expect(r.tag).toBe('FREE_CANCELLATION');
  });

  it('returns the player-tier refund (50% for late slot)', () => {
    const now = new Date('2099-01-09T13:00:00.000Z');
    const r = calculateRefund(booking, 'PLAYER', now);
    expect(r.refundPercent).toBe(50);
    expect(r.refundAmount).toBe(500);
    expect(r.tag).toBe('LATE_CANCELLATION');
  });

  it('VENDOR cancellations always refund 100% regardless of time', () => {
    const now = new Date('2099-01-10T18:00:00.000Z'); // slot long past
    const r = calculateRefund(booking, 'VENDOR', now);
    expect(r.refundPercent).toBe(100);
    expect(r.refundAmount).toBe(1000);
  });

  it('ADMIN cancellations always refund 100% regardless of time', () => {
    const now = new Date('2099-01-10T18:00:00.000Z');
    const r = calculateRefund(booking, 'ADMIN', now);
    expect(r.refundPercent).toBe(100);
    expect(r.refundAmount).toBe(1000);
  });

  it('OFFLINE bookings never have a monetary refund', () => {
    const offline = { ...booking, bookingType: 'OFFLINE', totalAmount: 0 };
    const r = calculateRefund(offline, 'VENDOR');
    expect(r.refundPercent).toBe(0);
    expect(r.refundAmount).toBe(0);
    expect(r.tag).toBe('OFFLINE');
  });
});
