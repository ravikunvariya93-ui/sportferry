// Clears all application data for a fresh start.
// Safety: dumps every collection to a timestamped folder under scratch/ (gitignored)
// before deleting, so the wipe is reversible.
//
//   node scripts/reset-data.cjs            # backup + wipe
//   node scripts/reset-data.cjs --no-backup
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const mongoose = require('mongoose');

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  const doBackup = !process.argv.includes('--no-backup');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log(`Connected to database: ${db.databaseName}`);

  const collections = (await db.listCollections().toArray()).map((c) => c.name);
  if (collections.length === 0) {
    console.log('No collections found. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  if (doBackup) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = path.resolve(__dirname, `../scratch/db-backup-${stamp}`);
    fs.mkdirSync(dir, { recursive: true });
    for (const name of collections) {
      const docs = await db.collection(name).find({}).toArray();
      fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(docs, null, 2));
      console.log(`  backed up ${name}: ${docs.length}`);
    }
    console.log(`Backup written to: ${dir}`);
  }

  console.log('\nClearing collections:');
  for (const name of collections) {
    const before = await db.collection(name).countDocuments();
    await db.collection(name).deleteMany({});
    const after = await db.collection(name).countDocuments();
    console.log(`  ${name.padEnd(20)} ${before} -> ${after}`);
  }

  await mongoose.disconnect();
  console.log('\nDone. Database is empty.');
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
