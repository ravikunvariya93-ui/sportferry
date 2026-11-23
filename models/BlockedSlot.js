import mongoose from 'mongoose';

const BlockedSlotSchema = new mongoose.Schema({
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true,
  },
  // Turf index (1..N) — matches Booking.turf and Turf.order.
  turf: {
    type: Number,
    required: true,
    min: 1,
  },
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String, // "18:00"
    required: true,
  },
  endTime: {
    type: String, // "19:00"
    required: true,
  },
  reason: {
    type: String,
    enum: ['MAINTENANCE', 'PRIVATE', 'TOURNAMENT'],
    default: 'MAINTENANCE',
  },
  note: {
    type: String,
    maxlength: 200,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

BlockedSlotSchema.index({ venue: 1, date: 1 });
// One block per turf+slot — re-blocking the same cell is a no-op.
BlockedSlotSchema.index({ venue: 1, turf: 1, date: 1, startTime: 1, endTime: 1 }, { unique: true });

export default (mongoose.models && mongoose.models.BlockedSlot) || mongoose.model('BlockedSlot', BlockedSlotSchema);
