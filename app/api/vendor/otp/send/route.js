import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { auth } from '@/lib/auth';
import { requireVendor } from '@/lib/vendorAuth';
import { generateOtp, hashOtp, OTP_TTL_MS } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const rl = rateLimit(`otp:${session.user.id}`, { limit: 5, windowMs: 10 * 60 * 1000 });
    if (!rl.ok) return NextResponse.json({ message: 'Too many codes requested. Try again later.' }, { status: 429 });

    const { phone } = await request.json();
    if (!/^\+?\d{10,15}$/.test(String(phone || '').replace(/[\s-]/g, ''))) {
      return NextResponse.json({ message: 'Enter a valid mobile number.' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ message: 'User not found.' }, { status: 404 });

    const code = generateOtp();
    user.phone = String(phone).trim();
    user.phoneOtpHash = hashOtp(code);
    user.phoneOtpExpires = new Date(Date.now() + OTP_TTL_MS);
    await user.save();

    // No SMS provider is configured. In production we email the code via Resend
    // when available; in development we return it so the flow can be tested.
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ message: 'SMS/email delivery is not configured.' }, { status: 503 });
      }
      await sendOtpEmail({ to: user.email, code });
      return NextResponse.json({ sent: true });
    }
    return NextResponse.json({ sent: true, devCode: code });
  } catch (error) {
    console.error('[POST /api/vendor/otp/send]', error);
    return NextResponse.json({ message: 'Could not send the code.' }, { status: 500 });
  }
}
