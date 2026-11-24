import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { apiError } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { auth, hasRole } from '@/lib/auth';
import { getISTDayRange, istTodayISO } from '@/lib/ist';
import { releaseExpiredPendingBookings } from '@/lib/booking-utils';
import { applyCancellation } from '@/lib/cancelBooking';
import { groupGames } from '@/lib/gameStatus';
import { claimBooking } from '@/lib/bookingClaims';

export async function GET(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || '';
    const venueId = searchParams.get('venueId') || '';
    const sport = searchParams.get('sport') || '';
    const date = searchParams.get('date') || '';
    const tab = searchParams.get('tab') || 'ACTIVE';

    await dbConnect();
    await releaseExpiredPendingBookings();

    const todayISO = istTodayISO();
    const fromISO = date || todayISO;
    const toISO = date || (() => { const d = new Date(`${todayISO}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 13); return d.toISOString().slice(0, 10); })();

    const query = {
      date: { $gte: getISTDayRange(fromISO).startUTC, $lte: getISTDayRange(toISO).endUTC },
      status: { $in: ['PENDING', 'CONFIRMED'] },
      bookingType: { $ne: 'OFFLINE' },
    };
    if (venueId) query.venue = venueId;
    if (sport) query.sport = sport;
    if (city) {
      const venuesInCity = await Venue.find({ city }).select('_id').lean();
      query.venue = { $in: venuesInCity.map(v => v._id) };
    }

    const bookings = await Booking.find(query)
      .populate('venue', 'name city area numberOfTurfs')
      .populate('user', 'name')
      .select('venue date startTime endTime turf status playersCount classification user')
      .lean();

    const shaped = bookings.map(b => ({
      ...b,
      venueId: b.venue?._id?.toString() || null,
      venueName: b.venue?.name || 'N/A',
      venueCity: b.venue?.city || '',
      userName: b.user?.name || 'Player',
    }));
    const grouped = groupGames({ bookings: shaped, todayISO });
    const rows = grouped.games.map(({ roster, ...game }) => ({ ...game, players_: roster }));
    const counts = grouped.counts;

    const filtered = rows.filter((r) => {
      if (tab === 'ACTIVE') return r.active && r.status !== 'CONFIRMED';
      if (tab === 'FILLING') return r.status === 'FILLING';
      if (tab === 'CONFIRMED') return r.status === 'CONFIRMED';
      return true;
    }).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    const venues = await Venue.find({}).select('name city').sort({ name: 1 }).lean();

    return NextResponse.json({
      games: filtered,
      counts,
      venues: venues.map(v => ({ id: v._id.toString(), name: v.name, city: v.city })),
    });
  } catch (error) {
    return apiError(error, 'GET /api/admin/games');
  }
}

export async function PATCH(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { venueId, date, startTime, endTime, turf, action } = await request.json();
    const valid = /^[a-f\d]{24}$/i.test(String(venueId))
      && /^\d{4}-\d{2}-\d{2}$/.test(String(date))
      && /^\d{2}:\d{2}$/.test(String(startTime))
      && /^\d{2}:\d{2}$/.test(String(endTime))
      && ['CONFIRM', 'CANCEL'].includes(action);
    if (!valid) {
      return NextResponse.json({ message: 'venueId, date, slot and a valid action are required.' }, { status: 400 });
    }

    await dbConnect();
    const filter = {
      venue: venueId,
      date: { $gte: getISTDayRange(date).startUTC, $lte: getISTDayRange(date).endUTC },
      startTime,
      endTime,
      turf: turf || 1,
    };

    if (action === 'CONFIRM') {
      await Booking.updateMany({ ...filter, status: 'PENDING' }, { $set: { status: 'CONFIRMED' } });
    } else {
      // Same cancellation path as the admin Bookings screen: record + execute
      // the 100% refund for every booking in the game.
      const docs = await Booking.find({ ...filter, status: { $in: ['PENDING', 'CONFIRMED'] } });
      for (const doc of docs) {
        const claimed = await claimBooking(
          { _id: doc._id, status: { $in: ['PENDING', 'CONFIRMED'] } },
          { status: 'CANCELLED' }
        );
        if (!claimed) continue;
        await applyCancellation(doc, { cancelledBy: 'ADMIN', reason: 'Game cancelled by admin' });
        await doc.save();
      }
    }

    return NextResponse.json({ ok: true, action });
  } catch (error) {
    return apiError(error, 'PATCH /api/admin/games');
  }
}
