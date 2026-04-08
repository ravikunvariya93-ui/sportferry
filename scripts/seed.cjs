const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Emulate User Model statically since we are in CJS and Next.js models might mix imports
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['USER', 'VENDOR', 'ADMIN'], default: 'USER' },
  phone: { type: String },
  city: { type: String },
}, { timestamps: true });

const VenueSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 60 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sportTypes: { type: [String], required: true, enum: ['Box Cricket', 'Tennis Ball Cricket', 'Football', 'Badminton', 'Tennis', 'Table Tennis'] },
  city: { type: String, required: true },
  area: { type: String, required: true },
  address: { type: String, required: true },
  pricePerHour: { type: Number, required: true },
  images: { type: [String], default: [] },
  amenities: { type: [String], default: [] },
  rating: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Venue = mongoose.models.Venue || mongoose.model('Venue', VenueSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Clear existing Venues & Users for a clean pristine creation (Users was already wiped but just making sure)
    await Venue.deleteMany({});
    console.log('Cleared existing venues.');

    const targetEmail = 'kunvariyaravi41@gmail.com';
    let user = await User.findOne({ email: targetEmail });

    if (!user) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      user = await User.create({
        name: 'Ravi Kunvariya',
        email: targetEmail,
        password: hashedPassword,
        role: 'VENDOR',
        phone: '+91 9876543210'
      });
      console.log(`Created new Vendor account for ${targetEmail} (Password: password123)`);
    } else {
      user.role = 'VENDOR';
      await user.save();
      console.log(`Found ${targetEmail}, ensuring VENDOR role.`);
    }

    const venuesToCreate = [
      {
        name: 'SuperStrikers Box Cricket Arena',
        owner: user._id,
        sportTypes: ['Box Cricket'],
        city: 'Mumbai',
        area: 'Andheri West',
        address: 'Veera Desai Road, Next to Country Club',
        pricePerHour: 1400,
        images: ['/assets/badminton.png'],
        amenities: ['Floodlights', 'Dugout', 'Seating Area', 'Parking'],
        rating: 4.9,
      },
      {
        name: 'Ravi\'s Pro Football Turf',
        owner: user._id,
        sportTypes: ['Football'],
        city: 'Mumbai',
        area: 'Bandra',
        address: 'Bandra Reclamation Ground',
        pricePerHour: 2200,
        images: ['/assets/tennis.png'],
        amenities: ['Artificial Grass', 'Floodlights', 'Restrooms', 'Cafeteria'],
        rating: 4.8,
      },
      {
        name: 'Dynamic Tennis Club',
        owner: user._id,
        sportTypes: ['Tennis'],
        city: 'Bangalore',
        area: 'Koramangala',
        address: '100ft Road, Koramangala 4th Block',
        pricePerHour: 800,
        images: ['/assets/tennis.png'],
        amenities: ['Hard Court', 'Coaching Available', 'Locker Room'],
        rating: 4.7,
      },
      {
        name: 'SmashZone Badminton Court',
        owner: user._id,
        sportTypes: ['Badminton'],
        city: 'Bangalore',
        area: 'Indiranagar',
        address: 'Double Road, Stage 2',
        pricePerHour: 500,
        images: ['/assets/badminton.png'],
        amenities: ['Wooden Floor', 'Air Conditioned', 'Pro Shop'],
        rating: 4.6,
      },
      {
        name: 'All-Star Mixed Arena',
        owner: user._id,
        sportTypes: ['Table Tennis', 'Box Cricket'],
        city: 'Delhi',
        area: 'Saket',
        address: 'Behind Select Citywalk',
        pricePerHour: 1000,
        images: ['/assets/hero-bg.png'],
        amenities: ['Indoor', 'Vending Machines', 'Changing Rooms'],
        rating: 4.5,
      }
    ];

    const createdVenues = await Venue.insertMany(venuesToCreate);
    console.log(`Successfully seeded ${createdVenues.length} venues strictly mapped to ${targetEmail}`);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

seed();
