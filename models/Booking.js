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
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
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
  paymentId: {
    type: String,
  },
}, {
  timestamps: true,
});

export default (mongoose.models && mongoose.models.Booking) || mongoose.model('Booking', BookingSchema);
