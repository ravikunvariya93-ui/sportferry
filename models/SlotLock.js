import mongoose from 'mongoose';

/**
 * One document per bookable slot, touched by every booking transaction for
 * that slot.
 *
 * The capacity check and the insert run in a transaction, but a transaction
 * gives snapshot isolation — not predicate locks — so two bookings for the
 * same slot can both pass the check and both commit. Writing this document
 * inside the transaction makes both transactions touch the *same* document, so
 * MongoDB aborts one of them (write conflict / duplicate key) and the caller
 * retries against a fresh snapshot.
 */
const SlotLockSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  touchedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

export default (mongoose.models && mongoose.models.SlotLock) || mongoose.model('SlotLock', SlotLockSchema);
