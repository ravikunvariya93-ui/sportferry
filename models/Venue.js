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
    enum: ['Box Cricket'],
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
  pricePerHour: {
    type: Number,
    required: true,
    min: [0, 'Price per hour cannot be negative.'],
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
}, {
  timestamps: true,
});

export default (mongoose.models && mongoose.models.Venue) || mongoose.model('Venue', VenueSchema);
