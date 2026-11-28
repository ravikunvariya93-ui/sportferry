import mongoose from 'mongoose';

const VenueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for this venue.'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sportTypes: {
    type: [String],
    required: true,
    enum: ['Box Cricket', 'Football', 'Tennis', 'Badminton', 'Basketball'],
  },
  city: {
    type: String,
    required: true,
  },
  area: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  // Kept as the venue's base (weekday) rate — Explore, Home and VenueCard read it.
  pricePerHour: {
    type: Number,
    required: true,
    min: [0, 'Price per hour cannot be negative.'],
  },
  // Per-day-type hourly rate. `peak` applies during PEAK_HOURS (evening) and wins
  // over the day type. `weekday` mirrors pricePerHour.
  pricing: {
    weekday: { type: Number, default: null, min: 0 },
    weekend: { type: Number, default: null, min: 0 },
    peak: { type: Number, default: null, min: 0 },
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative.'],
    max: [90, 'Discount cannot exceed 90%.'],
  },
  numberOfTurfs: {
    type: Number,
    default: 1,
    min: [1, 'Venue must have at least 1 turf.'],
  },
  images: {
    type: [String],
    default: [],
  },
  amenities: {
    type: [String],
    default: [],
  },
  rating: {
    type: Number,
    default: 0,
  },
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  // Verification documents (Blob URLs) captured in the owner onboarding wizard.
  documents: {
    businessIdProof: { type: String, default: '' },
    businessProof: { type: String, default: '' },
    venueProof: { type: String, default: '' },
  },
  onboardingStatus: {
    type: String,
    enum: ['DRAFT', 'PENDING', 'DOCUMENTS', 'REVIEW', 'ACTIVE', 'SUSPENDED', 'REJECTED'],
    default: 'ACTIVE',
  },
}, {
  timestamps: true,
});

VenueSchema.index({ city: 1, onboardingStatus: 1 });
VenueSchema.index({ owner: 1 });
VenueSchema.index({ createdAt: -1 });

export default (mongoose.models && mongoose.models.Venue) || mongoose.model('Venue', VenueSchema);
