import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { auth } from '@/lib/auth';
import { getISTDayRange } from '@/lib/ist';
import { blocksForDate } from '@/lib/blockedSlots';
import { loadTurfs } from '@/lib/turfs';
import { buildDayGrid } from '@/lib/calendarData';
import { requireVendor, ownedVenue } from '@/lib/vendorAuth';

export async function GET(request) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
      return NextResponse.json({ message: 'A valid date is required.' }, { status: 400 });
    }

    await dbConnect();
    const venue = await ownedVenue(session, searchParams.get('venueId'));
    if (!venue) return NextResponse.json({ message: 'Venue not found.' }, { status: 404 });

    const { startUTC, endUTC } = getISTDayRange(date);
    const [bookings, blocks, turfs] = await Promise.all([
      Booking.find({
        venue: venue._id,
        date: { $gte: startUTC, $lte: endUTC },
        status: { $in: ['PENDING', 'CONFIRMED', 'PAYMENT_PENDING'] },
      }).select('startTime endTime turf status playersCount classification bookingType offlineCustomerName').lean(),
      blocksForDate(venue._id, date),
      loadTurfs(venue._id),
    ]);

    return NextResponse.json(buildDayGrid({ venue, date, bookings, blocks, turfs }));
  } catch (error) {
    console.error('[GET /api/vendor/calendar]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
