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
    required: false,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['USER', 'VENDOR', 'ADMIN'],
    default: 'USER',
  },
  phone: {
    type: String,
  },
  city: {
    type: String,
  },
}, {
  timestamps: true,
});

export default (mongoose.models && mongoose.models.User) || mongoose.model('User', UserSchema);
