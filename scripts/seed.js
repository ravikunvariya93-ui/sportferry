import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Clear existing Venues just to be pristine (Optional but requested for clean data)
    await Venue.deleteMany({});
    console.log('Cleared existing venues.');

    // 2. Create target vendor user
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
      console.log('Created new Vendor account for kunvariyaravi41@gmail.com (pwd: password123)');
    } else {
      // Ensure role is VENDOR
      user.role = 'VENDOR';
      await user.save();
      console.log('Found kunvariyaravi41@gmail.com, ensuring VENDOR role.');
    }

    // 3. Create 5 exciting Venues exclusively for this vendor
    const venuesToCreate = [
      {
        name: 'SuperStrikers Box Cricket Arena',
        owner: user._id,
        sportTypes: ['Box Cricket'],
        city: 'Mumbai',
        area: 'Andheri West',
        address: 'Veera Desai Road, Next to Country Club',
        pricePerHour: 1400,
        images: ['/assets/badminton.png'], // we'll use our localized assets or reliable unplash fallbacks
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
    console.log(`Successfully seeded ${createdVenues.length} venues mapped to ${targetEmail}`);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

seed();
