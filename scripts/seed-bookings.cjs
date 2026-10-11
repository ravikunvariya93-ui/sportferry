const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI missing');

const SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00',
  '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00',
  '21:00',
];

const CLASSIFICATIONS = ['SOLO', 'SOLO', 'TEAM', 'TEAM'];
const PLAYER_COUNTS = { SOLO: [1, 2], TEAM: [4, 5, 6] };

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function seedBookings() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    const db = mongoose.connection.db;
    const venues = await db.collection('venues').find({}).toArray();
    if (venues.length === 0) {
      console.log('No venues found. Run seed.js first.');
      process.exit(1);
    }
    console.log(`Found ${venues.length} venues.`);

    const user = await db.collection('users').findOne({ role: 'PLAYER' });
    console.log(`Using user: ${user ? user.name : 'none'}`);

    const totalTurfs = venues.reduce((s, v) => s + v.numberOfTurfs, 0);
    console.log(`Total turfs across all venues: ${totalTurfs}`);

    // Proportional allocation
    let allocations = {};
    let allocated = 0;
    for (const v of venues) {
      const share = Math.round(100 * v.numberOfTurfs / totalTurfs);
      allocations[v._id.toString()] = { venue: v, count: share };
      allocated += share;
    }
    const diff = 100 - allocated;
    if (diff !== 0) {
      const keys = Object.keys(allocations);
      allocations[keys[0]].count += diff;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);

    const bookingsToInsert = [];

    for (const [venueId, { venue, count }] of Object.entries(allocations)) {
      const sport = (venue.sportTypes && venue.sportTypes.length > 0) ? venue.sportTypes[0] : 'Box Cricket';

      let created = 0;
      for (let d = new Date(tomorrow); d <= endDate && created < count; d.setDate(d.getDate() + 1)) {
        for (const slotStart of SLOTS) {
          if (created >= count) break;

          const startH = parseInt(slotStart.split(':')[0]);
          const endH = startH + 1;
          const endTime = `${String(endH).padStart(2, '0')}:00`;

          const classification = pick(CLASSIFICATIONS);
          const playersCount = pick(PLAYER_COUNTS[classification]);
          const teamSide = Math.random() < 0.5 ? 1 : 2;

          // IST midnight in UTC
          const bookingDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

          bookingsToInsert.push({
            venue: venue._id,
            user: user ? user._id : null,
            bookingType: 'OFFLINE',
            offlineCustomerName: `Seed Booking ${created + 1}`,
            date: bookingDate,
            startTime: slotStart + ':00',
            endTime: endTime,
            totalAmount: 0,
            commissionPercent: 12,
            commissionAmount: 0,
            status: 'CONFIRMED',
            sport,
            classification,
            playersCount,
            teamSide,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          created++;
        }
      }
      console.log(`  ${venue.name}: ${created} bookings`);
    }

    const BATCH_SIZE = 50;
    let inserted = 0;
    for (let i = 0; i < bookingsToInsert.length; i += BATCH_SIZE) {
      const batch = bookingsToInsert.slice(i, i + BATCH_SIZE);
      await db.collection('bookings').insertMany(batch);
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${bookingsToInsert.length}...`);
    }

    console.log(`\nDone! Created ${inserted} bookings across ${venues.length} venues.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

seedBookings();
