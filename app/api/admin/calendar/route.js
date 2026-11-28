import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { apiError, forbidden, badRequest } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import Booking from '@/models/Booking';
import { getISTDayRange, istTodayISO } from '@/lib/ist';
import { blocksForDate } from '@/lib/blockedSlots';
import { loadTurfs } from '@/lib/turfs';
import { buildDayGrid } from '@/lib/calendarData';

export async function GET(request) {
  try {
    const session = await requireAdmin();
    if (!session) return forbidden();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || istTodayISO();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return badRequest('A valid date is required.');
    }

    await dbConnect();

    // Admins see every venue, including those still pending or suspended.
    const venues = await Venue.find({}).select('name city area numberOfTurfs').sort({ name: 1 }).lean();
    const venueList = venues.map(v => ({ id: v._id.toString(), name: v.name, city: v.city, area: v.area }));

    const venueId = searchParams.get('venueId') || venueList[0]?.id;
    const venue = venueId ? venues.find(v => v._id.toString() === venueId) : null;
    if (!venue) {
      return NextResponse.json({ venues: venueList, date, venue: null, turfs: [], grid: [] });
    }

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

    return NextResponse.json({ venues: venueList, ...buildDayGrid({ venue, date, bookings, blocks, turfs }) });
  } catch (error) {
    return apiError(error, 'GET /api/admin/calendar');
  }
}
