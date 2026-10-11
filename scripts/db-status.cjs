// Reports which env vars are configured and what data currently exists.
// Never prints secret values — only presence and a credential-stripped Mongo target.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const mongoose = require('mongoose');

const KEYS = [
  'MONGODB_URI', 'NEXTAUTH_SECRET', 'AUTH_SECRET', 'NEXTAUTH_URL',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
  'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'BLOB_READ_WRITE_TOKEN',
];

function safeUri(uri) {
  try {
    const u = new URL(uri);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return '(unparseable)';
  }
}

(async () => {
  console.log('Env configured:');
  for (const k of KEYS) console.log(`  ${k.padEnd(24)} ${process.env[k] ? 'yes' : 'NO'}`);

  const uri = process.env.MONGODB_URI;
  if (!uri) { console.log('\nMONGODB_URI missing — aborting.'); process.exit(1); }

  console.log('\nMongo target:', safeUri(uri));
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  console.log('\nCollections:');
  let total = 0;
  for (const c of collections) {
    const n = await db.collection(c.name).countDocuments();
    total += n;
    console.log(`  ${c.name.padEnd(24)} ${n}`);
  }
  console.log(`  ${'TOTAL'.padEnd(24)} ${total}`);

  await mongoose.disconnect();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
