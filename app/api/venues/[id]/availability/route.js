import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ message: 'Date parameter is required.' }, { status: 400 });
    }

    await dbConnect();

    // Fetch all CONFIRMED or PENDING bookings for this venue on the specified date
    // We include PENDING because even if not yet approved, it's a "lock initiation"
    const bookings = await Booking.find({
      venue: params.id,
      date: new Date(date),
      status: { $in: ['PENDING', 'CONFIRMED'] },
    }).select('startTime endTime status bookingType').lean();

    // Format slots as "startTime – endTime" for easy comparison in the frontend
    const busySlots = bookings.map(b => `${b.startTime} – ${b.endTime}`);

    return NextResponse.json({ busySlots });
  } catch (error) {
    console.error('[GET /api/venues/[id]/availability]', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
