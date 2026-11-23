import mongoose from 'mongoose';

/**
 * Recurring schedules and special offers. `vendor: null` means a platform-wide
 * offer created by an admin; otherwise it belongs to one ground owner.
 */
const VendorOfferSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  type: { type: String, enum: ['RECURRING', 'SPECIAL'], required: true },
  title: { type: String, required: true, maxlength: 80 },
  days: { type: [String], default: [] }, // Mon..Sun for recurring offers
  startTime: { type: String, default: '' }, // "HH:mm"
  endTime: { type: String, default: '' },
  discountPercent: { type: Number, default: 0, min: 0, max: 90 },
  fixedPrice: { type: Number, default: 0, min: 0 },
  validFrom: { type: Date, default: null },
  validTo: { type: Date, default: null },
  active: { type: Boolean, default: true },
}, { timestamps: true, collection: 'vendoroffers' });

export default (mongoose.models && mongoose.models.VendorOffer) || mongoose.model('VendorOffer', VendorOfferSchema);
