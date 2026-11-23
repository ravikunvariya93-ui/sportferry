import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { auth } from '@/lib/auth';
import { requireVendor } from '@/lib/vendorAuth';
import { otpMatches, otpNotExpired } from '@/lib/otp';

export async function POST(request) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { code } = await request.json();
    if (!/^\d{6}$/.test(String(code || ''))) {
      return NextResponse.json({ message: 'Enter the 6-digit code.' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ message: 'User not found.' }, { status: 404 });

    if (!otpNotExpired(user.phoneOtpExpires)) {
      return NextResponse.json({ message: 'The code expired. Request a new one.' }, { status: 400 });
    }
    if (!otpMatches(user.phoneOtpHash, code)) {
      return NextResponse.json({ message: 'Incorrect code.' }, { status: 400 });
    }

    user.phoneVerified = true;
    user.phoneOtpHash = '';
    user.phoneOtpExpires = null;
    await user.save();

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error('[POST /api/vendor/otp/verify]', error);
    return NextResponse.json({ message: 'Could not verify the code.' }, { status: 500 });
  }
}
