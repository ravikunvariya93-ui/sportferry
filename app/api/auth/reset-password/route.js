import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { isValidPassword, PASSWORD_MIN, escapeRegex } from '@/lib/validation';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export async function POST(request) {
  try {
    const { email, token, password } = await request.json();
    if (!email || !token || !password) {
      return NextResponse.json({ message: 'Missing fields.' }, { status: 400 });
    }
    if (!isValidPassword(password)) {
      return NextResponse.json({ message: `Password must be at least ${PASSWORD_MIN} characters.` }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: { $regex: `^${escapeRegex(String(email).trim())}$`, $options: 'i' } });

    const invalid = !user || !user.resetToken || !user.resetTokenExpires
      || user.resetTokenExpires.getTime() < Date.now()
      || user.resetToken !== sha256(String(token));

    if (invalid) {
      return NextResponse.json({ message: 'This reset link is invalid or has expired. Request a new one.' }, { status: 400 });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    return NextResponse.json({ message: 'Password reset. You can now sign in.' });
  } catch (error) {
    console.error('[POST /api/auth/reset-password]', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
