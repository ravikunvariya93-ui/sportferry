import mongoose from 'mongoose';

/** A venue owner's staff member. Records only — no separate login accounts. */
const StaffMemberSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, maxlength: 80 },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['Manager', 'Operator', 'Viewer'], default: 'Viewer' },
  access: { type: String, default: 'Bookings, Check-in' },
  active: { type: Boolean, default: true },
}, { timestamps: true, collection: 'staffmembers' });

export default (mongoose.models && mongoose.models.StaffMember) || mongoose.model('StaffMember', StaffMemberSchema);
