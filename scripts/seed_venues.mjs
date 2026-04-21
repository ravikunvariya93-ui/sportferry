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
    const sports = ['Box Cricket'];
    const gujaratCities = ['Surat', 'Ahmedabad', 'Vadodara', 'Rajkot'];
    const gujaratAreas = ['Adajan', 'Vesu', 'Satellite', 'Prahlad Nagar', 'Alkapuri', 'Sayajigunj', 'Kalawad Road'];
    const venueNames = [
      'TopSpin Box Cricket', 'The Arena Gujarat', 'Surat Super Strikers', 
      'Ahmedabad Action Arena', 'Vadodara Victory Turf', 'Rajkot Royals Box',
      'SkyLine Sports', 'Green Field Box', 'Master Blasters Turf', 'Gujarat Game Zone'
    ];

    for (let i = 0; i < 10; i++) {
        await Venue.create({
            name: venueNames[i],
            owner: vendor._id,
            sportTypes: ['Box Cricket'],
            city: gujaratCities[i % gujaratCities.length],
            area: gujaratAreas[i % gujaratAreas.length],
            address: `${(i + 1) * 12} High Street, Near Landmark Center, ${gujaratCities[i % gujaratCities.length]}`,
            pricePerHour: 800 + (i * 100),
            amenities: ['Parking', 'Drinking Water', 'Floodlights', 'Seating Area'],
            rating: 4.2 + (i * 0.08),
            images: [`https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=800`]
        });
        console.log(`Created Venue: ${venueNames[i]}`);
    }

    console.log('Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
