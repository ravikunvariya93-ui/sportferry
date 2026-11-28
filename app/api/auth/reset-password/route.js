import { NextResponse } from 'next/server';
import { apiError, badRequest } from '@/lib/apiResponse';
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
      return badRequest('Missing fields.');
    }
    if (!isValidPassword(password)) {
      return badRequest(`Password must be at least ${PASSWORD_MIN} characters.`);
    }

    await dbConnect();
    const user = await User.findOne({ email: { $regex: `^${escapeRegex(String(email).trim())}$`, $options: 'i' } });

    const invalid = !user || !user.resetToken || !user.resetTokenExpires
      || user.resetTokenExpires.getTime() < Date.now()
      || user.resetToken !== sha256(String(token));

    if (invalid) {
      return badRequest('This reset link is invalid or has expired. Request a new one.');
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    return NextResponse.json({ message: 'Password reset. You can now sign in.' });
  } catch (error) {
    return apiError(error, 'POST /api/auth/reset-password', { message: 'Something went wrong.' });
  }
}
