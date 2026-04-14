/**
 * Script to promote a user to ADMIN role.
 * Usage: node scripts/make-admin.js <email>
 * Example: node scripts/make-admin.js owner@sportferry.com
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const email = process.argv[2];
if (!email) {
  console.error('❌  Please provide an email address.');
  console.error('    Usage: node scripts/make-admin.js <email>');
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['USER', 'VENDOR', 'ADMIN'], default: 'USER' },
  phone: String,
  city: String,
}, { timestamps: true });

const User = mongoose.models?.User || mongoose.model('User', UserSchema);

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅  Connected to MongoDB');

    const user = await User.findOneAndUpdate(
      { email },
      { role: 'ADMIN' },
      { new: true }
    );

    if (!user) {
      console.error(`❌  No user found with email: ${email}`);
      process.exit(1);
    }

    console.log(`✅  Successfully promoted "${user.name}" (${user.email}) to ADMIN`);
  } catch (err) {
    console.error('❌  Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
