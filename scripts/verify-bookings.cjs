const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const total = await db.collection('bookings').countDocuments();
  console.log('Total bookings:', total);

  console.log('\nBy venue:');
  const byVenue = await db.collection('bookings').aggregate([
    { $group: { _id: '$venue', count: { $sum: 1 } } }
  ]).toArray();
  for (const v of byVenue) {
    const venue = await db.collection('venues').findOne({ _id: v._id });
    console.log('  ' + (venue ? venue.name : v._id) + ': ' + v.count);
  }

  console.log('\nBy status:');
  const byStatus = await db.collection('bookings').aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]).toArray();
  for (const s of byStatus) console.log('  ' + s._id + ': ' + s.count);

  console.log('\nBy classification:');
  const byClass = await db.collection('bookings').aggregate([
    { $group: { _id: '$classification', count: { $sum: 1 } } }
  ]).toArray();
  for (const c of byClass) console.log('  ' + c._id + ': ' + c.count);

  const dates = await db.collection('bookings').aggregate([
    { $group: { _id: null, minDate: { $min: '$date' }, maxDate: { $max: '$date' } } }
  ]).toArray();
  if (dates[0]) {
    console.log('\nDate range: ' + dates[0].minDate.toISOString() + ' to ' + dates[0].maxDate.toISOString());
  }

  await mongoose.disconnect();
})().catch(console.error);
