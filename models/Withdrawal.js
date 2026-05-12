import mongoose from 'mongoose';

const WithdrawalSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  commissionDeducted: {
    type: Number,
    default: 0,
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED'],
    default: 'PENDING',
  },
  month: {
    type: Number, // 1-12
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  processedAt: {
    type: Date,
  },
  adminNotes: {
    type: String,
    maxlength: 500,
  },
  vendorNotes: {
    type: String,
    maxlength: 500,
  },
}, {
  timestamps: true,
});

// Ensure one withdrawal per vendor per month
WithdrawalSchema.index({ vendor: 1, month: 1, year: 1 }, { unique: true });

export default (mongoose.models && mongoose.models.Withdrawal) || mongoose.model('Withdrawal', WithdrawalSchema);
