// One-off, idempotent migration for the ground-owner model:
//   - venues get onboardingStatus (ACTIVE) and pricing.weekday = pricePerHour;
//   - each venue gets Turf docs (one per numberOfTurfs) when it has none.
//
//   node scripts/migrate-owner-model.cjs
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const mongoose = require('mongoose');

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const venues = db.collection('venues');
  const turfs = db.collection('turfs');

  const all = await venues.find({}).toArray();
  let statusSet = 0;
  let pricingSet = 0;
  let turfsCreated = 0;

  for (const v of all) {
    const set = {};
    if (!v.onboardingStatus) {
      set.onboardingStatus = 'ACTIVE';
      statusSet += 1;
    }
    if (!v.pricing || v.pricing.weekday == null) {
      set.pricing = {
        weekday: Number(v.pricePerHour) || 0,
        weekend: v.pricing?.weekend ?? null,
        peak: v.pricing?.peak ?? null,
      };
      pricingSet += 1;
    }
    if (Object.keys(set).length) await venues.updateOne({ _id: v._id }, { $set: set });

    const existing = await turfs.countDocuments({ venue: v._id });
    if (existing === 0) {
      const n = Math.max(1, parseInt(v.numberOfTurfs, 10) || 1);
      const docs = Array.from({ length: n }, (_, i) => ({
        venue: v._id,
        name: `Turf ${i + 1}`,
        sport: (Array.isArray(v.sportTypes) && v.sportTypes[0]) || 'Box Cricket',
        size: { length: 0, width: 0, unit: 'Feet' },
        surface: 'Synthetic Turf',
        playingFormat: '',
        lighting: true,
        isActive: true,
        order: i + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await turfs.insertMany(docs);
      turfsCreated += n;
    }
  }

  console.log(`venues: ${all.length} | onboardingStatus set: ${statusSet} | pricing set: ${pricingSet} | turfs created: ${turfsCreated}`);
  await mongoose.disconnect();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
