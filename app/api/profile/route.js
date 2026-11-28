import { auth } from '@/lib/auth';
import { apiError, unauthorized, badRequest, notFound } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function PATCH(request) {
  const session = await auth();
  if (!session) {
    return unauthorized('Unauthorized');
  }

  await dbConnect();

  try {
    const body = await request.json();
    const { name, phone, city } = body;

    // Build update object — only include fields that are provided
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (phone !== undefined) update.phone = phone.trim();
    if (city !== undefined) update.city = city.trim();

    if (Object.keys(update).length === 0) {
      return badRequest('No fields to update.');
    }

    // Validate name is not empty if provided
    if (update.name !== undefined && update.name.length === 0) {
      return badRequest('Name cannot be empty.');
    }

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedUser) {
      return notFound('User not found.');
    }

    return NextResponse.json({
      message: 'Profile updated successfully.',
      user: {
        name: updatedUser.name,
        phone: updatedUser.phone || '',
        city: updatedUser.city || '',
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ message: 'Failed to update profile.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await auth();
  if (!session) {
    return unauthorized('Unauthorized');
  }

  try {
    const body = await request.json().catch(() => ({}));

    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user) {
      return notFound('User not found.');
    }

    // Confirm identity when the account has a password.
    if (user.password) {
      const ok = body.password && await bcrypt.compare(body.password, user.password);
      if (!ok) {
        return badRequest('Password is incorrect.');
      }
    }

    const Venue = (await import('@/models/Venue')).default;
    const Booking = (await import('@/models/Booking')).default;

    const ownedVenues = await Venue.countDocuments({ owner: user._id });
    if (ownedVenues > 0) {
      return badRequest(`You still own ${ownedVenues} venue(s). Delete them before deleting your account.`);
    }

    await Booking.deleteMany({ user: user._id });
    await User.findByIdAndDelete(user._id);

    return NextResponse.json({ message: 'Account deleted.' });
  } catch (error) {
    return apiError(error, 'DELETE /api/profile', { message: 'Failed to delete account.' });
  }
}
