import mongoose from 'mongoose';

/**
 * One document per vendor settlement, touched by every admin payout inside its
 * transaction.
 *
 * Reading the payable and inserting the batch are two steps: two admins
 * clicking "settle" at the same moment would both read the full outstanding
 * balance and both insert a batch, paying the vendor twice. Writing this
 * document inside the transaction makes the two settlements collide on the
 * same document, so MongoDB aborts one and the caller retries against a
 * snapshot that already contains the winner's batch.
 *
 * The vendor id is used as `_id` (not a secondary `key` field) so the collision
 * holds even on a database where indexes were never built: `_id` is always
 * unique, whereas a plain `key` field is only unique when its index exists.
 */
const PayoutLockSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  touchedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  _id: false,
});

export default (mongoose.models && mongoose.models.PayoutLock) || mongoose.model('PayoutLock', PayoutLockSchema);
