/**
 * Sportferry — Cancellation Policy Engine
 *
 * Player-Initiated:
 *   24+ hrs before slot  → 100% refund  (FREE_CANCELLATION)
 *   12–24 hrs            → 50%  refund  (LATE_CANCELLATION)
 *   < 12 hrs             → 0%  refund   (NO_REFUND)
 *   After slot starts    → BLOCKED
 *
 * Vendor / Admin-Initiated:
 *   Always 100% refund to the player.
 */

const POLICY_TIERS = [
  { minHours: 24,  refundPercent: 100, label: 'Free Cancellation',  tag: 'FREE_CANCELLATION' },
  { minHours: 12,  refundPercent: 50,  label: 'Late Cancellation',  tag: 'LATE_CANCELLATION' },
  { minHours: 0,   refundPercent: 0,   label: 'No Refund',          tag: 'NO_REFUND' },
];

/**
 * Build a Date object for the exact slot start in IST.
 * `booking.date` is midnight UTC for that date,
 * `booking.startTime` is "HH:MM" in IST (UTC+5:30).
 */
function getSlotStartDate(booking) {
  const d = new Date(booking.date);
  // Set to midnight of that date in UTC
  d.setUTCHours(0, 0, 0, 0);

  const [h, m] = (booking.startTime || '00:00').split(':').map(Number);

  // IST offset is +5:30 → to get UTC, subtract 5h 30m
  const utcHours = h - 5;
  const utcMinutes = m - 30;

  d.setUTCHours(d.getUTCHours() + utcHours);
  d.setUTCMinutes(d.getUTCMinutes() + utcMinutes);

  return d;
}

/**
 * Calculate hours remaining until the slot starts.
 * Returns a negative number if the slot has already started.
 */
export function hoursUntilSlot(booking, now = new Date()) {
  const slotStart = getSlotStartDate(booking);
  return (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60);
}

/**
 * Get the applicable cancellation tier for a player-initiated cancellation.
 * Returns { refundPercent, label, tag, hoursLeft, blocked }
 */
export function getPlayerCancellationTier(booking, now = new Date()) {
  const hrs = hoursUntilSlot(booking, now);

  if (hrs <= 0) {
    return {
      refundPercent: 0,
      label: 'Slot Already Started',
      tag: 'BLOCKED',
      hoursLeft: 0,
      blocked: true,
    };
  }

  for (const tier of POLICY_TIERS) {
    if (hrs >= tier.minHours) {
      return {
        ...tier,
        hoursLeft: Math.floor(hrs),
        blocked: false,
      };
    }
  }

  // Fallback (should not reach)
  return { refundPercent: 0, label: 'No Refund', tag: 'NO_REFUND', hoursLeft: Math.floor(hrs), blocked: false };
}

/**
 * Calculate the refund amount for a cancellation.
 * - Player-initiated: time-based tiers
 * - Vendor / Admin-initiated: always 100%
 */
export function calculateRefund(booking, cancelledBy = 'PLAYER', now = new Date()) {
  const totalAmount = booking.totalAmount || 0;

  // Offline bookings have no monetary refund
  if (booking.bookingType === 'OFFLINE') {
    return { refundPercent: 0, refundAmount: 0, label: 'Offline Booking', tag: 'OFFLINE' };
  }

  // Vendor or Admin always gives 100% refund
  if (cancelledBy === 'VENDOR' || cancelledBy === 'ADMIN') {
    return {
      refundPercent: 100,
      refundAmount: totalAmount,
      label: 'Full Refund (Cancelled by ' + (cancelledBy === 'VENDOR' ? 'Venue' : 'Admin') + ')',
      tag: 'FULL_REFUND',
    };
  }

  // Player-initiated
  const tier = getPlayerCancellationTier(booking, now);
  if (tier.blocked) {
    return { refundPercent: 0, refundAmount: 0, label: tier.label, tag: tier.tag };
  }

  const refundAmount = Math.round((totalAmount * tier.refundPercent) / 100);
  return {
    refundPercent: tier.refundPercent,
    refundAmount,
    label: tier.label,
    tag: tier.tag,
  };
}

/**
 * Human-readable policy summary for display in the UI.
 */
export const CANCELLATION_POLICY_TEXT = [
  {
    window: '24+ hours before slot',
    refund: '100% refund',
    description: 'Cancel worry-free. Full refund guaranteed.',
    icon: '✅',
  },
  {
    window: '12–24 hours before slot',
    refund: '50% refund',
    description: 'Half the booking amount will be refunded.',
    icon: '⚠️',
  },
  {
    window: 'Less than 12 hours',
    refund: 'No refund',
    description: 'Cancellations this close to the slot are non-refundable.',
    icon: '❌',
  },
  {
    window: 'After slot starts',
    refund: 'Not allowed',
    description: 'Bookings cannot be cancelled once the game has started.',
    icon: '🚫',
  },
];
