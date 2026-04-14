import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve('.env.local') });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: false },
  password: { type: String, required: true },
  role: { type: String, enum: ['USER', 'VENDOR', 'ADMIN'], default: 'USER' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Delete ALL existing users
    const deleteRes = await User.deleteMany({});
    console.log(`Deleted ${deleteRes.deletedCount} existing users.`);

    // 2. Hash password '123'
    const hashedPassword = await bcrypt.hash('123', 10);

    // 3. Create 3 users
    const usersToCreate = [
      {
        name: 'Admin User',
        username: 'admin',
        email: 'admin@sportferry.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
      {
        name: 'Vendor User',
        username: 'vendor',
        email: 'vendor@sportferry.com',
        password: hashedPassword,
        role: 'VENDOR',
      },
      {
        name: 'Regular User',
        username: 'user',
        email: 'user@sportferry.com',
        password: hashedPassword,
        role: 'USER',
      }
    ];

    for (const u of usersToCreate) {
      await User.create(u);
      console.log(`Created ${u.username} (${u.role})`);
    }

    console.log('Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
