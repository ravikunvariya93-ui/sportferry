import mongoose from 'mongoose';

/** Single document holding platform-wide switches. Commission stays in constants. */
const PlatformSettingsSchema = new mongoose.Schema({
  rules: {
    teamMatch: { type: Boolean, default: true },
    autoConfirm: { type: Boolean, default: true },
    groupNeedsEmpty: { type: Boolean, default: true },
    noDoubleBooking: { type: Boolean, default: true },
  },
  general: {
    supportEmail: { type: String, default: 'support@sportferry.com' },
    supportPhone: { type: String, default: '+91 98765 43210' },
    address: { type: String, default: 'Mumbai, Maharashtra, India' },
  },
  automation: {
    payouts: { type: Boolean, default: false },
    refunds: { type: Boolean, default: false },
    notifications: { type: Boolean, default: true },
  },
}, { timestamps: true, collection: 'platformsettings' });

export default (mongoose.models && mongoose.models.PlatformSettings) || mongoose.model('PlatformSettings', PlatformSettingsSchema);
