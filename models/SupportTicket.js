import mongoose from 'mongoose';

const ReplySchema = new mongoose.Schema({
  author: { type: String, default: '' },
  body: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const SupportTicketSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', default: null },
  subject: { type: String, required: true, maxlength: 120 },
  body: { type: String, required: true, maxlength: 2000 },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'], default: 'OPEN' },
  replies: { type: [ReplySchema], default: [] },
}, { timestamps: true, collection: 'supporttickets' });

export default (mongoose.models && mongoose.models.SupportTicket) || mongoose.model('SupportTicket', SupportTicketSchema);
