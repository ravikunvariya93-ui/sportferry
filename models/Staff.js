import mongoose from 'mongoose';

/** Platform-level staff record (no separate auth account). */
const StaffSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 80 },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['Manager', 'Support', 'Operator', 'Viewer'], default: 'Viewer' },
  active: { type: Boolean, default: true },
}, { timestamps: true, collection: 'staff' });

export default (mongoose.models && mongoose.models.Staff) || mongoose.model('Staff', StaffSchema);
