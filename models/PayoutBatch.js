import mongoose from 'mongoose';

/**
 * A settlement of a vendor's earnings for a period. `PayoutBatch` only records
 * that the vendor has been paid (automated bank transfer or a manual transfer
 * with a reference) — actual money movement happens outside the app, mirroring
 * the monthly withdrawal flow.
 */
const PayoutBatchSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  bookingsCount: { type: Number, default: 0 },
  gross: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
  // The vendor's net earnings for the period.
  net: { type: Number, default: 0 },
  // The amount this batch actually settled (may be less than `net` when part of
  // the period was already paid earlier). This is what subtraction uses.
  settledAmount: { type: Number, default: 0 },
  // Snapshot of the bank account at payout time (the vendor may change it later).
  bankAccountSnapshot: {
    accountHolderName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifsc: { type: String, default: '' },
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'PROCESSING',
  },
  method: {
    type: String,
    enum: ['AUTOMATED', 'MANUAL'],
    default: 'AUTOMATED',
  },
  reference: { type: String, default: '' },
  note: { type: String, maxlength: 300, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: { type: Date },
}, {
  timestamps: true,
  collection: 'payoutbatches',
});

PayoutBatchSchema.index({ vendor: 1, periodEnd: -1 });

export default (mongoose.models && mongoose.models.PayoutBatch) || mongoose.model('PayoutBatch', PayoutBatchSchema);
