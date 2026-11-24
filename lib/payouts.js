/**
 * Vendor payable math for admin settlements. Pure — no DB.
 *
 * Gross is the sum of a vendor's confirmed online bookings; the platform keeps
 * `commissionPercent`; the vendor is owed the rest. Anything already settled
 * (a completed/processing PayoutBatch or a completed withdrawal) is subtracted.
 */

export function commissionOf(gross, commissionPercent) {
  return Math.round((Number(gross) || 0) * (Number(commissionPercent) || 0) / 100);
}

/**
 * Amount already paid or committed to a vendor. Completed/processing batches
 * and pending/processing/completed withdrawals all reduce what is payable, so
 * no two settlement paths can pay the same earnings twice.
 */
export function settledAmountForVendor({ withdrawals = [], batches = [] } = {}) {
  const fromWithdrawals = withdrawals
    .filter(w => ['PENDING', 'PROCESSING', 'COMPLETED'].includes(w.status))
    .reduce((sum, w) => sum + (w.netAmount || 0), 0);
  const fromBatches = batches
    .filter(b => ['COMPLETED', 'PROCESSING'].includes(b.status))
    .reduce((sum, b) => sum + (b.settledAmount ?? b.net ?? 0), 0);
  return fromWithdrawals + fromBatches;
}

/**
 * @param {object} args
 * @param {Array} args.bookings Confirmed online bookings, each `{ vendorId, totalAmount }`.
 * @param {Record<string, number>} [args.settledByVendor] vendorId → net already settled.
 * @param {number} [args.commissionPercent]
 * @returns {Array<{ vendorId, bookings, gross, commission, net, payable }>}
 */
export function computeVendorPayables({ bookings = [], settledByVendor = {}, commissionPercent = 12 }) {
  const map = new Map();
  for (const b of bookings) {
    const vendorId = b.vendorId != null ? String(b.vendorId) : null;
    if (!vendorId) continue;
    if (!map.has(vendorId)) map.set(vendorId, { vendorId, bookings: 0, gross: 0 });
    const row = map.get(vendorId);
    row.bookings += 1;
    row.gross += Number(b.totalAmount) || 0;
  }

  return [...map.values()].map((row) => {
    const commission = commissionOf(row.gross, commissionPercent);
    const net = row.gross - commission;
    const settled = Number(settledByVendor[row.vendorId]) || 0;
    return { ...row, commission, net, payable: Math.max(0, net - settled) };
  });
}
