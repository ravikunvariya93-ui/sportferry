// Create or promote an ADMIN account.
//
//   node scripts/create-admin.cjs <email> [password] [name]
//
//   - existing user + password  -> promote to ADMIN and reset password
//   - existing user, no password -> promote to ADMIN (password untouched)
//   - new user + password        -> create an ADMIN (login uses email as username)
//   - new user, no password      -> error
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const [, , email, password, name = 'Administrator'] = process.argv;

if (!email) {
  console.error('Usage: node scripts/create-admin.cjs <email> [password] [name]');
  process.exit(1);
}
if (password && password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set (.env.local).');
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  email: { type: String, unique: true, sparse: true },
  password: String,
  role: { type: String, enum: ['PLAYER', 'VENDOR', 'ADMIN'], default: 'PLAYER' },
  phone: String,
  city: String,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'ADMIN';
    if (password) existing.password = await bcrypt.hash(password, 10);
    await existing.save();
    console.log(`Promoted "${email}" to ADMIN${password ? ' (password reset)' : ''}.`);
  } else if (password) {
    await User.create({
      name,
      username: email,
      email,
      password: await bcrypt.hash(password, 10),
      role: 'ADMIN',
    });
    console.log(`Created ADMIN "${email}".`);
  } else {
    console.error(`No user found with email "${email}". Provide a password to create one.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  await mongoose.disconnect();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
