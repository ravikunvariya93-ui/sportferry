/**
 * Build every index declared in the Mongoose schemas.
 *
 * Production runs with `autoIndex` off, so schema-declared indexes are NOT
 * created automatically — `slotlocks` proved it: the model declares
 * `key: unique`, yet a fresh collection got only `_id`, and a lock that relied
 * on that index silently stopped preventing a race.
 *
 * Run this once per deploy (or after adding an index):
 *   node scripts/ensure-indexes.mjs
 *
 * Idempotent: `syncIndexes()` drops indexes no longer in the schema and builds
 * the missing ones.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, '..', '.env.local'), quiet: true });

const { default: dbConnect } = await import('../lib/mongodb.js');

const MODELS = [
  'User', 'Venue', 'Booking', 'Turf', 'BlockedSlot', 'SlotLock', 'PayoutLock',
  'Withdrawal', 'PayoutBatch', 'PlatformSettings', 'StaffMember', 'SupportTicket',
  'VendorSettings', 'VendorOffer', 'RateLimit',
];

await dbConnect();
let built = 0;

for (const name of MODELS) {
  let model;
  try {
    ({ default: model } = await import(`../models/${name}.js`));
  } catch {
    continue; // model file not present — nothing to sync
  }
  try {
    await model.syncIndexes();
    const indexes = await model.collection.indexes();
    console.log(`✓ ${name}: ${indexes.map(i => i.name).join(', ')}`);
    built += 1;
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
  }
}

console.log(`\nSynced indexes for ${built} models.`);
await mongoose.disconnect();
