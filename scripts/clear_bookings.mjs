import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve('.env.local') });

const BookingSchema = new mongoose.Schema({}, { strict: false });
const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

async function clearBookings() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing');
    }

    // Safety check for production instances
    const isProductionLike = process.env.MONGODB_URI.includes('production') || process.env.MONGODB_URI.includes('cluster0');
    
    if (isProductionLike && process.argv[2] !== '--force-clear') {
      console.error('CAUTION: You are trying to clear bookings in a production-like database!');
      console.error('This will delete EVERYTHING in the bookings collection. Use --force-clear if you are SURE.');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    const count = await Booking.countDocuments({});
    console.log(`Found ${count} bookings.`);

    if (count === 0) {
      console.log('Nothing to delete.');
    } else {
      const res = await Booking.deleteMany({});
      console.log(`Successfully deleted ${res.deletedCount} bookings.`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (err) {
    console.error('Operation failed:', err);
    process.exit(1);
  }
}

clearBookings();
