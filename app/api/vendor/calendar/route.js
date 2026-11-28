import { NextResponse } from 'next/server';
import { requireVendorSession } from '@/lib/apiGuards';
import { apiError, forbidden, badRequest, notFound } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { getISTDayRange } from '@/lib/ist';
import { blocksForDate } from '@/lib/blockedSlots';
import { loadTurfs } from '@/lib/turfs';
import { buildDayGrid } from '@/lib/calendarData';
import { ownedVenue } from '@/lib/vendorAuth';

export async function GET(request) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
      return badRequest('A valid date is required.');
    }

    await dbConnect();
    const venue = await ownedVenue(session, searchParams.get('venueId'));
    if (!venue) return notFound('Venue not found.');

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
    return apiError(error, 'GET /api/vendor/calendar');
  }
}
