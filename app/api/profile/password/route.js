import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { auth } from '@/lib/auth';
import { isValidPassword, PASSWORD_MIN } from '@/lib/validation';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: 'Current and new passwords are required.' }, { status: 400 });
    }
    if (!isValidPassword(newPassword)) {
      return NextResponse.json({ message: `New password must be at least ${PASSWORD_MIN} characters.` }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    if (!user.password) {
      return NextResponse.json({ message: 'This account signs in with Google, so it has no password to change.' }, { status: 400 });
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 400 });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return NextResponse.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('[POST /api/profile/password]', error);
    return NextResponse.json({ message: 'Failed to update password.' }, { status: 500 });
  }
}
