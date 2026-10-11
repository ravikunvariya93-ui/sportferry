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
  phone: {
    type: String,
  },
  city: {
    type: String,
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
