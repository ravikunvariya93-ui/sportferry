import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional for OFFLINE bookings
  },
  bookingType: {
    type: String,
    enum: ['ONLINE', 'OFFLINE'],
    default: 'ONLINE',
  },
  offlineCustomerName: {
    type: String,
  },
  offlineCustomerPhone: {
    type: String,
  },
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String, // e.g., "18:00"
    required: true,
  },
  endTime: {
    type: String, // e.g., "19:00"
    required: true,
  },
  totalAmount: {
    type: Number,
    required: false, // Optional for OFFLINE blocks
    default: 0,
  },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'PAYMENT_PENDING'],
    default: 'PENDING',
  },
  sport: {
    type: String,
    required: [true, 'Please specify the sport for this booking.'],
  },
  classification: {
    type: String,
    enum: ['SOLO', 'TEAM', 'GROUP'],
    default: 'SOLO',
  },
  playersCount: {
    type: Number,
    default: 1,
    min: 1,
  },
  teamSide: {
    type: Number,
    enum: [1, 2],
    default: 1,
  },
  paymentId: {
    type: String,
  },
  razorpayOrderId: {
    type: String,
  },
  razorpaySignature: {
    type: String,
  },
  // ── Commission Fields ─────────────────────────────────────────────────
  commissionPercent: {
    type: Number,
    default: 12,
  },
  commissionAmount: {
    type: Number,
    default: 0,
  },
  // ── Multi-slot Booking Group ──────────────────────────────────────────
  groupId: {
    type: String, // UUID linking bookings made in a single multi-slot purchase
  },
  // ── Cancellation Policy Fields ───────────────────────────────────────
  cancelledBy: {
    type: String,
    enum: ['PLAYER', 'VENDOR', 'ADMIN'],
  },
  cancelledAt: {
    type: Date,
  },
  cancellationReason: {
    type: String,
    maxlength: 500,
  },
  refundPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

export default (mongoose.models && mongoose.models.Booking) || mongoose.model('Booking', BookingSchema);
