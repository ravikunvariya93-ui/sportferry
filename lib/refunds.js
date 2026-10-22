import { refundPayment } from './razorpay';

/**
 * Run the refund a cancellation is owed.
 *
 * `refundAmount` on a booking is only the *intended* amount — this is what
 * actually asks Razorpay to give the money back, and what turns that intent
 * into a `COMPLETED` / `FAILED` / `NONE` status.
 *
 * Offline (walk-in) bookings have no payment to refund, so they stay NONE.
 *
 * @param {object} booking Booking document (needs paymentId, bookingType).
 * @param {number} amountRupees Amount to refund in rupees.
 * @returns {Promise<{ status: 'NONE'|'COMPLETED'|'FAILED', refundId?: string, error?: string }>}
 */
export async function executeRefund(booking, amountRupees) {
  const amount = Math.round(Number(amountRupees) || 0);
  if (amount <= 0) return { status: 'NONE' };
  if (booking?.bookingType === 'OFFLINE' || !booking?.paymentId) return { status: 'NONE' };

  const result = await refundPayment(booking.paymentId, amount);
  if (!result.ok) return { status: 'FAILED', error: result.error };
  return { status: 'COMPLETED', refundId: result.refundId };
}
