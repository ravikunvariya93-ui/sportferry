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
    enum: ['Box Cricket', 'Tennis Ball Cricket', 'Football', 'Badminton', 'Tennis', 'Table Tennis'],
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
}, {
  timestamps: true,
});

export default (mongoose.models && mongoose.models.Venue) || mongoose.model('Venue', VenueSchema);
