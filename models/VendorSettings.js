import mongoose from 'mongoose';

/** One settings document per ground owner. */
const VendorSettingsSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  notifications: {
    sms: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    slotFill: { type: Boolean, default: true },
    reminders: { type: Boolean, default: true },
  },
  general: {
    venueName: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
  },
}, { timestamps: true, collection: 'vendorsettings' });

export default (mongoose.models && mongoose.models.VendorSettings) || mongoose.model('VendorSettings', VendorSettingsSchema);
