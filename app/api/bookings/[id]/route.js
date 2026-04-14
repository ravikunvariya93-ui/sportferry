import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const { status } = body;

    const booking = await Booking.findById(params.id).populate('venue');
    if (!booking) {
      return NextResponse.json({ message: 'Booking not found.' }, { status: 404 });
    }

    // Allow cancellation by either the customer or the venue owner
    // Allow approval (CONFIRMED) only by the venue owner
    const isCustomer = booking.user?.toString() === session.user.id;
    const isVenueOwner = booking.venue?.owner?.toString() === session.user.id;

    if (status === 'CONFIRMED') {
      if (!isVenueOwner) {
        return NextResponse.json({ message: 'Only the venue owner can approve bookings.' }, { status: 403 });
      }
      booking.status = 'CONFIRMED';
    } else {
      // Default behavior was cancellation
      if (!isCustomer && !isVenueOwner) {
        return NextResponse.json({ message: 'You are not authorized to perform this action.' }, { status: 403 });
      }
      booking.status = 'CANCELLED';
    }

    await booking.save();
    return NextResponse.json({ success: true, status: booking.status });
  } catch (error) {
    console.error('[PATCH /api/bookings/[id]]', error);
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
