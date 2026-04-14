import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env.local') });

const UserSchema = new mongoose.Schema({ username: String });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const VenueSchema = new mongoose.Schema({
  name: String, owner: mongoose.Schema.Types.ObjectId, sportTypes: [String],
  city: String, area: String, address: String, pricePerHour: Number,
  images: [String], amenities: [String], rating: Number
});
const Venue = mongoose.models.Venue || mongoose.model('Venue', VenueSchema);

const BookingSchema = new mongoose.Schema({ venue: mongoose.Schema.Types.ObjectId });
const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 1. Delete all venues and bookings
    await Booking.deleteMany({});
    await Venue.deleteMany({});
    console.log('Cleared all venues and bookings.');

    // 2. Find vendor user
    const vendor = await User.findOne({ username: 'vendor' });
    if (!vendor) throw new Error('Vendor user not found. Run seed_users.mjs first.');

    // 3. Create 10 venues
    const sports = ['Box Cricket', 'Football', 'Badminton', 'Tennis'];
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad'];
    const areas = ['Downtown', 'West End', 'Sports Complex', 'Green Park'];

    for (let i = 1; i <= 10; i++) {
        await Venue.create({
            name: `Extreme Arena ${i}`,
            owner: vendor._id,
            sportTypes: [sports[i % sports.length]],
            city: cities[i % cities.length],
            area: areas[i % areas.length],
            address: `${i * 101} Main St, ${cities[i % cities.length]}`,
            pricePerHour: 500 + (i * 50),
            amenities: ['Parking', 'Water', 'Changing Room'],
            rating: 4 + (i * 0.1)
        });
        console.log(`Created Venue ${i}`);
    }

    console.log('Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
