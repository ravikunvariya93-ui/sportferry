import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { escapeRegex } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rateLimit';
import { sendPasswordResetEmail } from '@/lib/email';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export async function POST(request) {
  try {
    const rl = rateLimit(`forgot:${clientIp(request)}`, { limit: 5, windowMs: 15 * 60 * 1000 });
    if (!rl.ok) {
      return NextResponse.json({ message: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ message: 'Email is required.' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: { $regex: `^${escapeRegex(email.trim())}$`, $options: 'i' } });

    // Always give the same answer — never reveal whether the email exists.
    const generic = { message: 'If that email is registered, a reset link has been sent.' };

    if (user && user.password) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetToken = sha256(token);
      user.resetTokenExpires = new Date(Date.now() + TOKEN_TTL_MS);
      await user.save();

      const origin = new URL(request.url).origin;
      const resetUrl = `${origin}/reset-password?email=${encodeURIComponent(user.email)}&token=${token}`;

      let emailed = false;
      try {
        emailed = await sendPasswordResetEmail({ to: user.email, resetUrl });
      } catch (err) {
        console.error('[forgot-password] email send failed:', err.message);
      }

      // Dev fallback: no email provider configured → return the link so localhost works.
      if (!emailed && process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ ...generic, devResetUrl: resetUrl });
      }
    }

    return NextResponse.json(generic);
  } catch (error) {
    console.error('[POST /api/auth/forgot-password]', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
