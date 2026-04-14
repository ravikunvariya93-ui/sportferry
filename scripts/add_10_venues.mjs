import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve('.env.local') });

// Define minimal schemas for the script to avoid Next.js model registry issues
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String, required: true },
  role: { type: String, enum: ['USER', 'VENDOR', 'ADMIN'], default: 'USER' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const VenueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sportTypes: { type: [String], required: true },
  city: { type: String, required: true },
  area: { type: String, required: true },
  address: { type: String, required: true },
  pricePerHour: { type: Number, required: true },
  images: { type: [String], default: [] },
  amenities: { type: [String], default: [] },
  rating: { type: Number, default: 0 },
}, { timestamps: true });

const Venue = mongoose.models.Venue || mongoose.model('Venue', VenueSchema);

async function addVenues() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing in .env.local');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully.');

    // 1. Find or Create Vendor User
    let vendor = await User.findOne({ username: 'vendor' });
    if (!vendor) {
      console.log('Vendor user not found. Creating one...');
      const hashedPassword = await bcrypt.hash('123', 10);
      vendor = await User.create({
        name: 'Vendor User',
        username: 'vendor',
        email: 'vendor@sportferry.com',
        password: hashedPassword,
        role: 'VENDOR',
      });
      console.log('Created Vendor User.');
    } else {
      console.log(`Found existing Vendor User: ${vendor.username}`);
    }

    // 2. Generate and Add 10 Venues
    const sportsList = ['Box Cricket', 'Football', 'Badminton', 'Tennis', 'Table Tennis'];
    const citiesList = ['Mumbai', 'Pune', 'Bangalore', 'Delhi'];
    const amenitiesList = ['Parking', 'Drinking Water', 'Changing Room', 'Washroom', 'Floodlights', 'CCTV'];
    const areaMap = {
      'Mumbai': ['Andheri', 'Bandra', 'Borivali', 'Juhu'],
      'Pune': ['Kothrud', 'Baner', 'Wakad', 'Viman Nagar'],
      'Bangalore': ['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout'],
      'Delhi': ['Rohini', 'Dwarka', 'Saket', 'Connaught Place']
    };

    console.log('Adding 10 venues...');
    const venueProms = [];
    
    for (let i = 1; i <= 10; i++) {
      const city = citiesList[i % citiesList.length];
      const areas = areaMap[city];
      const area = areas[i % areas.length];
      const sports = [sportsList[i % sportsList.length]];
      if (i % 3 === 0) sports.push(sportsList[(i + 1) % sportsList.length]); // Add multi-sport occasionally

      const venueData = {
        name: `Pro Sports Hub ${i + 10}`, // Offset name to avoid direct duplicates if run multiple times
        owner: vendor._id,
        sportTypes: sports,
        city: city,
        area: area,
        address: `${100 + i * 5}, ${area}, ${city}`,
        pricePerHour: 400 + (i * 75),
        amenities: amenitiesList.slice(0, 3 + (i % 4)),
        rating: (3.5 + (Math.random() * 1.5)).toFixed(1),
        images: [`https://picsum.photos/seed/venue${i+10}/800/600`]
      };

      venueProms.push(Venue.create(venueData));
    }

    const createdVenues = await Promise.all(venueProms);
    console.log(`Successfully added ${createdVenues.length} new venues.`);

    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Error adding venues:', error);
    process.exit(1);
  }
}

addVenues();
