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

    if (!status) {
      return NextResponse.json({ message: 'Status is required.' }, { status: 400 });
    }

    const booking = await Booking.findById(params.id).populate('venue');
    if (!booking) {
      return NextResponse.json({ message: 'Booking not found.' }, { status: 404 });
    }

    const isCustomer = booking.user?.toString() === session.user.id;
    const isVenueOwner = booking.venue?.owner?.toString() === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    // 1. Handle Approval
    if (status === 'CONFIRMED') {
      if (!isVenueOwner && !isAdmin) {
        return NextResponse.json({ message: 'Not authorized to approve this booking.' }, { status: 403 });
      }
      
      if (booking.status === 'CANCELLED') {
        return NextResponse.json({ message: 'Cannot approve a cancelled booking.' }, { status: 400 });
      }

      booking.status = 'CONFIRMED';
    } 
    // 2. Handle Cancellation
    else if (status === 'CANCELLED') {
      if (!isCustomer && !isVenueOwner && !isAdmin) {
        return NextResponse.json({ message: 'Not authorized to cancel this booking.' }, { status: 403 });
      }

      if (booking.status === 'CANCELLED') {
        return NextResponse.json({ message: 'Booking is already cancelled.' }, { status: 400 });
      }

      booking.status = 'CANCELLED';
    } 
    else {
      return NextResponse.json({ message: 'Invalid status update.' }, { status: 400 });
    }

    await booking.save();
    return NextResponse.json({ 
      success: true, 
      status: booking.status,
      message: `Booking successfully ${status.toLowerCase()}.`
    });
  } catch (error) {
    console.error('[PATCH /api/bookings/[id]]', error);
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
