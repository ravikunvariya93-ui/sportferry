import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required.'],
    unique: true,
  },
  password: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    enum: ['PLAYER', 'VENDOR', 'ADMIN'],
    default: 'PLAYER',
  },
  // Set by admin — a blocked account cannot sign in.
  blocked: {
    type: Boolean,
    default: false,
  },
  phone: {
    type: String,
  },
  city: {
    type: String,
  },
  // Payout destination for ground owners (captured in onboarding).
  bankDetails: {
    accountHolderName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifsc: { type: String, default: '' },
  },
  // Password reset (stores a hash of the token, never the raw token).
  resetToken: {
    type: String,
  },
  resetTokenExpires: {
    type: Date,
  },
}, {
  timestamps: true,
});

export default (mongoose.models && mongoose.models.User) || mongoose.model('User', UserSchema);
