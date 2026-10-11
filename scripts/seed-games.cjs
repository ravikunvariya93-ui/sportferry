// Seeds demo "games" (bookings) for today & tomorrow so the home page
// "Tonight's Games Near You" section has content.
//
//   node scripts/seed-games.cjs            # seed
//   node scripts/seed-games.cjs --clear    # remove demo games
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const mongoose = require('mongoose');

const IST_MS = 330 * 60 * 1000;
const MARK = /^Demo Game/;

const istDateStr = (offsetDays) => {
  const d = new Date(Date.now() + IST_MS + offsetDays * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};
const utcMidnight = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

// Evening 1-hour slots (IST) — the kind of "tonight's games" people join.
const SLOTS = [['18:00', '19:00'], ['19:00', '20:00'], ['20:00', '21:00'], ['21:00', '22:00']];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const cleared = await db.collection('bookings').deleteMany({ offlineCustomerName: MARK });
  if (process.argv.includes('--clear')) {
    console.log(`Cleared ${cleared.deletedCount} demo games.`);
    await mongoose.disconnect();
    return;
  }

  const venues = await db.collection('venues').find({ city: { $in: ['Ahmedabad', 'Bhavnagar'] } }).toArray();
  if (venues.length === 0) {
    console.error('No seeded venues found. Run scripts/seed-venues.cjs first.');
    await mongoose.disconnect();
    return;
  }

  const now = new Date();
  const dates = [istDateStr(0), istDateStr(1)];
  const docs = [];

  venues.forEach((v, vi) => {
    dates.forEach((dateStr) => {
      // 2 slots per venue per day (3 for venues with more turfs)
      const picks = SLOTS.slice(0, v.numberOfTurfs > 2 ? 3 : 2);
      picks.forEach((s, i) => {
        const tag = `Demo Game ${v._id} ${dateStr} ${s[0]}`;
        // Team A: a partial team; Team B: a couple of players → a joinable game.
        docs.push({
          venue: v._id, user: null, bookingType: 'OFFLINE',
          offlineCustomerName: `${tag} A`,
          date: utcMidnight(dateStr), startTime: s[0], endTime: s[1],
          totalAmount: 0, commissionPercent: 12, commissionAmount: 0,
          status: 'CONFIRMED', sport: 'Box Cricket',
          classification: 'TEAM', playersCount: (vi + i) % 2 ? 4 : 5, teamSide: 1, turf: 1,
          createdAt: now, updatedAt: now,
        });
        docs.push({
          venue: v._id, user: null, bookingType: 'OFFLINE',
          offlineCustomerName: `${tag} B`,
          date: utcMidnight(dateStr), startTime: s[0], endTime: s[1],
          totalAmount: 0, commissionPercent: 12, commissionAmount: 0,
          status: 'CONFIRMED', sport: 'Box Cricket',
          classification: 'SOLO', playersCount: (vi + i) % 2 ? 2 : 1, teamSide: 2, turf: 1,
          createdAt: now, updatedAt: now,
        });
      });
    });
  });

  const r = await db.collection('bookings').insertMany(docs);
  console.log(`Seeded ${r.insertedCount} demo game bookings across ${venues.length} venues (today + tomorrow).`);
  await mongoose.disconnect();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
