import Razorpay from 'razorpay';

/**
 * Single place that talks to Razorpay.
 *
 * The app creates orders, captures payments and refunds money — all of it
 * through this module so the credentials, the error shape and the
 * "did the money actually move" bookkeeping stay in one file.
 */

export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** @returns {Razorpay | null} null when payments are not configured. */
export function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

/**
 * Refund a captured payment.
 *
 * @param {string} paymentId Razorpay payment id (pay_…).
 * @param {number} amountRupees Amount to refund in rupees (converted to paise).
 * @returns {Promise<{ ok: boolean, refundId?: string, error?: string }>}
 */
export async function refundPayment(paymentId, amountRupees) {
  const razorpay = getRazorpay();
  if (!razorpay) return { ok: false, error: 'Payments are not configured.' };
  if (!paymentId) return { ok: false, error: 'No payment id on this booking.' };

  const amount = Math.round(Number(amountRupees) * 100);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Invalid refund amount.' };
  }

  try {
    const refund = await razorpay.payments.refund(paymentId, { amount });
    return { ok: true, refundId: refund?.id, status: refund?.status };
  } catch (err) {
    return { ok: false, error: err?.message || 'Refund failed.' };
  }
}

/**
 * Fetch a payment from Razorpay.
 *
 * @returns {Promise<{ ok: boolean, payment?: object, error?: string }>}
 */
export async function fetchPayment(paymentId) {
  const razorpay = getRazorpay();
  if (!razorpay) return { ok: false, error: 'Payments are not configured.' };
  if (!paymentId) return { ok: false, error: 'Missing payment id.' };

  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return { ok: true, payment };
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not fetch payment.' };
  }
}

/**
 * True when a Razorpay payment has actually been captured (money in).
 * @param {object} payment Razorpay payment object.
 */
export function isCaptured(payment) {
  return Boolean(payment) && payment.status === 'captured';
}
