import mongoose from 'mongoose';

const TurfSchema = new mongoose.Schema({
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a name for this turf.'],
    maxlength: [60, 'Turf name cannot be more than 60 characters'],
  },
  sport: {
    type: String,
    required: true,
  },
  size: {
    length: { type: Number, default: null },
    width: { type: Number, default: null },
    unit: { type: String, default: 'Feet' },
  },
  surface: {
    type: String,
    default: 'Synthetic Turf',
  },
  playingFormat: {
    type: String,
    default: '',
  },
  lighting: {
    type: Boolean,
    default: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // The turf's position within its venue (1..N). A booking's `turf` field is this
  // index, so capacity/allocation keeps working unchanged.
  order: {
    type: Number,
    required: true,
    min: 1,
  },
}, {
  timestamps: true,
  // Mongoose would pluralise "Turf" to "turves" — pin the collection so the
  // migration/seed scripts (and any tooling) agree on "turfs".
  collection: 'turfs',
});

TurfSchema.index({ venue: 1, order: 1 }, { unique: true });

export default (mongoose.models && mongoose.models.Turf) || mongoose.model('Turf', TurfSchema);
