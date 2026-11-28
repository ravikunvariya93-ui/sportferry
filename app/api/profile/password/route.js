import { NextResponse } from 'next/server';
import { apiError, unauthorized, badRequest, notFound } from '@/lib/apiResponse';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { auth } from '@/lib/auth';
import { isValidPassword, PASSWORD_MIN } from '@/lib/validation';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session) return unauthorized('Unauthorized');

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return badRequest('Current and new passwords are required.');
    }
    if (!isValidPassword(newPassword)) {
      return badRequest(`New password must be at least ${PASSWORD_MIN} characters.`);
    }

    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user) return notFound('User not found.');
    if (!user.password) {
      return badRequest('This account signs in with Google, so it has no password to change.');
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return badRequest('Current password is incorrect.');

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return NextResponse.json({ message: 'Password updated successfully.' });
  } catch (error) {
    return apiError(error, 'POST /api/profile/password', { message: 'Failed to update password.' });
  }
}
