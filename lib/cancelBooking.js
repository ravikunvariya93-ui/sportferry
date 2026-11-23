import { calculateRefund } from './cancellationPolicy';
import { executeRefund } from './refunds';

/**
 * Apply an admin/vendor cancellation to a booking document **in memory** and
 * execute the refund it is owed. The caller saves the booking afterwards.
 *
 * Used by both the admin booking PATCH and the Games & Matching cancel action,
 * so a cancellation always computes the 100% admin/vendor refund and actually
 * asks Razorpay to return the money — never a bare status flip.
 *
 * @param {object} booking Booking document or lean object (needs paymentId,
 *   bookingType, totalAmount).
 * @param {object} [opts]
 * @param {'ADMIN'|'VENDOR'} [opts.cancelledBy]
 * @param {string} [opts.reason]
 * @param {Date} [opts.now]
 * @returns {Promise<object>} the same booking, mutated.
 */
export async function applyCancellation(booking, { cancelledBy = 'ADMIN', reason, now = new Date() } = {}) {
  if (!booking || booking.status === 'CANCELLED') return booking;

  const refund = calculateRefund(booking, cancelledBy, now);

  booking.status = 'CANCELLED';
  if (!booking.cancelledBy) {
    booking.cancelledBy = cancelledBy;
    booking.cancelledAt = now;
    booking.cancellationReason = reason || (cancelledBy === 'ADMIN' ? 'Cancelled by admin' : 'Cancelled by venue');
    booking.refundPercent = refund.refundPercent;
    booking.refundAmount = refund.refundAmount;

    const result = await executeRefund(booking, refund.refundAmount);
    booking.refundStatus = result.status;
    if (result.refundId) booking.refundId = result.refundId;
    if (result.status === 'FAILED') {
      console.error('[applyCancellation] refund failed', result.error);
    }
  }

  return booking;
}
