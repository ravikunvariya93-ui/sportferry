import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function PATCH(request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ message: 'No fields to update.' }, { status: 400 });
    }

    // Validate name is not empty if provided
    if (update.name !== undefined && update.name.length === 0) {
      return NextResponse.json({ message: 'Name cannot be empty.' }, { status: 400 });
    }

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
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
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    // Confirm identity when the account has a password.
    if (user.password) {
      const ok = body.password && await bcrypt.compare(body.password, user.password);
      if (!ok) {
        return NextResponse.json({ message: 'Password is incorrect.' }, { status: 400 });
      }
    }

    const Venue = (await import('@/models/Venue')).default;
    const Booking = (await import('@/models/Booking')).default;

    const ownedVenues = await Venue.countDocuments({ owner: user._id });
    if (ownedVenues > 0) {
      return NextResponse.json({ message: `You still own ${ownedVenues} venue(s). Delete them before deleting your account.` }, { status: 400 });
    }

    await Booking.deleteMany({ user: user._id });
    await User.findByIdAndDelete(user._id);

    return NextResponse.json({ message: 'Account deleted.' });
  } catch (error) {
    console.error('[DELETE /api/profile]', error);
    return NextResponse.json({ message: 'Failed to delete account.' }, { status: 500 });
  }
}
