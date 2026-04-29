import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { NextResponse } from 'next/server';

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
