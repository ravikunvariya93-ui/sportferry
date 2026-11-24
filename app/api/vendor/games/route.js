import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';
import { requireVendor } from '@/lib/vendorAuth';
import { getISTDayRange, istTodayISO, isValidDateISO } from '@/lib/ist';
import { groupGames } from '@/lib/gameStatus';
import { releaseExpiredPendingBookings } from '@/lib/booking-utils';

export async function GET(request) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || istTodayISO();
    if (!isValidDateISO(date)) return NextResponse.json({ message: 'A valid date (YYYY-MM-DD) is required.' }, { status: 400 });

    await dbConnect();

    const venues = await Venue.find({ owner: session.user.id }).select('name city area').lean();
    const ids = venues.map(v => v._id);
    await releaseExpiredPendingBookings({ venue: { $in: ids } });

    const venueMap = {};
    venues.forEach(v => { venueMap[v._id.toString()] = v; });

    const { startUTC, endUTC } = getISTDayRange(date);
    const bookings = await Booking.find({
      venue: { $in: ids },
      date: { $gte: startUTC, $lte: endUTC },
      status: { $in: ['PENDING', 'CONFIRMED'] },
    }).populate('user', 'name').select('venue user offlineCustomerName date startTime endTime turf playersCount classification teamSide status').lean();

    const shaped = bookings.map(b => ({
      ...b,
      venueId: b.venue?._id?.toString() || null,
      venueName: venueMap[b.venue?._id?.toString()]?.name || 'N/A',
      venueCity: venueMap[b.venue?._id?.toString()]?.city || '',
      userName: b.user?.name || b.offlineCustomerName || 'Player',
    }));

    const result = groupGames({ bookings: shaped, todayISO: date });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/vendor/games]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
