import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { getISTDayRange, parseSlot, cleanupExpiredPayments } from '@/lib/booking-utils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const slot = searchParams.get('slot'); // e.g. "06:00 AM – 07:00 AM" or "All Slots"

    if (!date) {
      return NextResponse.json({ message: 'Date parameter is required (YYYY-MM-DD).' }, { status: 400 });
    }

    await dbConnect();
    await cleanupExpiredPayments();

    const { startUTC, endUTC } = getISTDayRange(date);

    const match = {
      date: { $gte: startUTC, $lte: endUTC },
      status: { $in: ['PENDING', 'CONFIRMED', 'PAYMENT_PENDING'] },
    };

    // Narrow to a specific time slot if provided
    if (slot && slot !== 'All Slots') {
      const parsed = parseSlot(slot);
      if (!parsed) {
        return NextResponse.json({ message: 'Invalid slot format.' }, { status: 400 });
      }
      match.startTime = parsed.startTime;
      match.endTime = parsed.endTime;
    }

    const agg = await Booking.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$venue',
          totalPlayers: { $sum: '$playersCount' },
          bookingCount: { $sum: 1 },
        },
      },
    ]);

    const counts = {};
    agg.forEach((row) => {
      counts[row._id.toString()] = {
        total: row.totalPlayers,
        bookings: row.bookingCount,
      };
    });

    return NextResponse.json({ date, slot: slot || 'All Slots', counts });
  } catch (error) {
    console.error('[GET /api/venues/popularity]', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
