import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env.local') });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String },
  role: { type: String, enum: ['USER', 'VENDOR', 'ADMIN'], default: 'USER' },
  phone: { type: String },
  city: { type: String },
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const VenueSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 60 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sportTypes: { type: [String], required: true, enum: ['Box Cricket'] },
  city: { type: String, required: true },
  area: { type: String, required: true },
  address: { type: String, required: true },
  pricePerHour: { type: Number, required: true },
  numberOfTurfs: { type: Number, default: 1, min: 1 },
  images: { type: [String], default: [] },
  amenities: { type: [String], default: [] },
  rating: { type: Number, default: 0 },
}, { timestamps: true });
const Venue = mongoose.models.Venue || mongoose.model('Venue', VenueSchema);

const IMG_CRICKET = 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=800';
const IMG_ARENA = 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=800';

// 5 Gujarat cities × 2 venues = 10 venues
const SEED = [
  // Ahmedabad
  { name: 'Ahmedabad Strikers Box Cricket', city: 'Ahmedabad', area: 'Satellite', address: '101 Satellite Cross Road, Near PVR, Ahmedabad', pricePerHour: 1200, numberOfTurfs: 2, rating: 4.6 },
  { name: 'Sabarmati Turf Arena', city: 'Ahmedabad', area: 'Prahlad Nagar', address: '12 Prahlad Nagar Garden Road, Ahmedabad', pricePerHour: 1000, numberOfTurfs: 1, rating: 4.4 },
  // Surat
  { name: 'Surat Super Strikers', city: 'Surat', area: 'Adajan', address: '45 Adajan Patiya, Ring Road, Surat', pricePerHour: 900, numberOfTurfs: 2, rating: 4.5 },
  { name: 'Diamond City Box Arena', city: 'Surat', area: 'Vesu', address: '8 Vesu-Dindoli Road, Near Galaxy, Surat', pricePerHour: 1100, numberOfTurfs: 1, rating: 4.7 },
  // Vadodara
  { name: 'Vadodara Victory Turf', city: 'Vadodara', area: 'Alkapuri', address: '23 Alkapuri Circle, Gotri Road, Vadodara', pricePerHour: 800, numberOfTurfs: 1, rating: 4.3 },
  { name: 'Sayaji Box Cricket Club', city: 'Vadodara', area: 'Sayajigunj', address: '7 Sayajigunj Main Road, Near Station, Vadodara', pricePerHour: 850, numberOfTurfs: 2, rating: 4.5 },
  // Rajkot
  { name: 'Rajkot Royals Box', city: 'Rajkot', area: 'Kalawad Road', address: '19 Kalawad Road, Near Rajkot Tower, Rajkot', pricePerHour: 700, numberOfTurfs: 1, rating: 4.2 },
  { name: 'Kathiawar Cricket Arena', city: 'Rajkot', area: 'Sadar', address: '31 Sadar Bazar Road, Rajkot', pricePerHour: 750, numberOfTurfs: 2, rating: 4.4 },
  // Bhavnagar
  { name: 'Bhavnagar Blasters Box', city: 'Bhavnagar', area: 'Nilambag', address: '14 Nilambag Palace Road, Bhavnagar', pricePerHour: 600, numberOfTurfs: 1, rating: 4.1 },
  { name: 'Sihor Star Turf', city: 'Bhavnagar', area: 'Takhteshwar', address: '9 Takhteshwar Temple Road, Bhavnagar', pricePerHour: 650, numberOfTurfs: 2, rating: 4.3 },
];

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing in .env.local');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  // Find or create the vendor user (username: vendor)
  let vendor = await User.findOne({ username: 'vendor' });
  if (!vendor) {
    const hashed = await bcrypt.hash('123', 10);
    vendor = await User.create({
      name: 'Vendor User',
      username: 'vendor',
      email: 'vendor@sportferry.com',
      password: hashed,
      role: 'VENDOR',
    });
    console.log('Created vendor user "vendor".');
  } else {
    console.log(`Found vendor user: ${vendor.username} (${vendor._id})`);
  }

  const beforeCount = await Venue.countDocuments({ owner: vendor._id });
  console.log(`Vendor currently has ${beforeCount} venue(s).`);

  let created = 0, updated = 0;
  for (const v of SEED) {
    const spec = {
      name: v.name,
      owner: vendor._id,
      sportTypes: ['Box Cricket'],
      city: v.city,
      area: v.area,
      address: v.address,
      pricePerHour: v.pricePerHour,
      numberOfTurfs: v.numberOfTurfs,
      images: [created % 2 === 0 ? IMG_CRICKET : IMG_ARENA],
      amenities: ['Parking', 'Drinking Water', 'Restrooms', 'Floodlights', 'Seating Area'],
      rating: v.rating,
    };
    // Upsert by (name + owner) so re-running never duplicates
    const res = await Venue.findOneAndUpdate(
      { name: v.name, owner: vendor._id },
      { $set: spec },
      { upsert: true, new: true }
    );
    created++;
    console.log(`✔ ${v.city} — ${v.name} (${v.area}) ₹${v.pricePerHour}/hr`);
  }

  const afterCount = await Venue.countDocuments({ owner: vendor._id });
  const byCity = await Venue.aggregate([
    { $match: { owner: vendor._id } },
    { $group: { _id: '$city', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  console.log(`\nDone. Vendor "${vendor.username}" now has ${afterCount} venue(s) total.`);
  console.log('Cities breakdown:', JSON.stringify(byCity.map(c => ({ city: c._id, venues: c.count }))));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Seeding failed:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
