// Demo seeder: 5 Ahmedabad + 5 Bhavnagar box-cricket venues, one shared image,
// multiple turfs each, owned by a demo VENDOR account.
//
//   node scripts/seed-venues.cjs
//
// Demo owner login:  vendor@sportferry.test  /  Vendor@12345
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const IMG = 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=1200';
const OWNER_EMAIL = 'vendor@sportferry.test';
const OWNER_PASS = 'Vendor@12345';

const AHMEDABAD = [
  { name: 'Arena 360 Box Cricket', area: 'Satellite', turfs: 3, price: 1200, rating: 4.7 },
  { name: 'Prahlad Nagar Play Zone', area: 'Prahlad Nagar', turfs: 2, price: 1400, rating: 4.6 },
  { name: 'Bopal Sports Hub', area: 'Bopal', turfs: 4, price: 1100, rating: 4.5 },
  { name: 'Maninagar Super Turf', area: 'Maninagar', turfs: 2, price: 1000, rating: 4.4 },
  { name: 'SG Highway Cricket Park', area: 'SG Highway', turfs: 3, price: 1600, rating: 4.8 },
];

const BHAVNAGAR = [
  { name: 'Waghawadi Box Arena', area: 'Waghawadi Road', turfs: 2, price: 900, rating: 4.5 },
  { name: 'Kaliyabid Cricket Ground', area: 'Kaliyabid', turfs: 3, price: 800, rating: 4.3 },
  { name: 'Krishna Nagar Turf Club', area: 'Krishna Nagar', turfs: 2, price: 950, rating: 4.6 },
  { name: 'Ghogha Road Play Park', area: 'Ghogha Road', turfs: 4, price: 850, rating: 4.4 },
  { name: 'Subhashnagar Sports Arena', area: 'Subhashnagar', turfs: 3, price: 1000, rating: 4.7 },
];

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const users = db.collection('users');
  const venues = db.collection('venues');

  // Owner (demo vendor)
  let owner = await users.findOne({ email: OWNER_EMAIL });
  if (!owner) {
    const res = await users.insertOne({
      name: 'Sportferry Demo Vendor',
      username: OWNER_EMAIL,
      email: OWNER_EMAIL,
      password: await bcrypt.hash(OWNER_PASS, 10),
      role: 'VENDOR',
      city: 'Ahmedabad',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    owner = { _id: res.insertedId };
    console.log(`Created demo vendor ${OWNER_EMAIL} (password ${OWNER_PASS})`);
  } else {
    console.log(`Using existing vendor ${OWNER_EMAIL}`);
  }

  const docs = [
    ...AHMEDABAD.map(v => ({ ...v, city: 'Ahmedabad' })),
    ...BHAVNAGAR.map(v => ({ ...v, city: 'Bhavnagar' })),
  ].map(v => ({
    name: v.name,
    owner: owner._id,
    sportTypes: ['Box Cricket'],
    city: v.city,
    area: v.area,
    address: `${v.area}, ${v.city}`,
    pricePerHour: v.price,
    numberOfTurfs: v.turfs,
    images: [IMG],
    amenities: ['Floodlights', 'Parking', 'Drinking Water', 'Restroom'],
    rating: v.rating,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const del = await venues.deleteMany({ city: { $in: ['Ahmedabad', 'Bhavnagar'] } });
  const ins = await venues.insertMany(docs);
  console.log(`Cleared ${del.deletedCount} old, inserted ${ins.insertedCount} venues (5 Ahmedabad, 5 Bhavnagar).`);

  await mongoose.disconnect();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
