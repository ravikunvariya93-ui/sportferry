import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { auth, hasRole } from '@/lib/auth';
import { getISTDayRange, istTodayISO, formatToAMPM } from '@/lib/ist';
import { PLAYERS_PER_SIDE } from '@/lib/capacity';
import { releaseExpiredPendingBookings } from '@/lib/booking-utils';
import { applyCancellation } from '@/lib/cancelBooking';
import { bookingRef } from '@/lib/bookingRef';

async function requireAdmin() {
  const session = await auth();
  if (!session || !(await hasRole(session, 'ADMIN'))) return null;
  return session;
}

const TURF_CAPACITY = PLAYERS_PER_SIDE * 2;

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

    // Group by venue + date + slot + turf.
    const groups = new Map();
    for (const b of bookings) {
      const dayISO = new Date(b.date).toISOString().slice(0, 10);
      const key = `${b.venue?._id}|${dayISO}|${b.startTime}|${b.endTime}|${b.turf || 1}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          venueId: b.venue?._id?.toString() || null,
          venueName: b.venue?.name || 'N/A',
          venueCity: b.venue?.city || '',
          date: dayISO,
          startTime: b.startTime,
          endTime: b.endTime,
          slot: `${formatToAMPM(b.startTime)} – ${formatToAMPM(b.endTime)}`,
          turf: b.turf || 1,
          players: 0,
          capacity: TURF_CAPACITY,
          classifications: new Set(),
          statuses: new Set(),
          players_: [],
        });
      }
      const g = groups.get(key);
      g.players += b.playersCount || 0;
      g.classifications.add(b.classification);
      g.statuses.add(b.status);
      g.players_.push({ ref: bookingRef(b._id), name: b.user?.name || 'Player', playersCount: b.playersCount, classification: b.classification, status: b.status });
    }

    const isToday = (dayISO) => dayISO === todayISO;
    const rows = [...groups.values()].map((g) => {
      const confirmed = g.statuses.has('CONFIRMED');
      const status = confirmed ? 'CONFIRMED' : 'FILLING';
      return {
        ...g,
        classifications: [...g.classifications],
        status,
        active: isToday(g.date),
        spotsLeft: Math.max(0, TURF_CAPACITY - g.players),
      };
    });

    const filtered = rows.filter((r) => {
      if (tab === 'ACTIVE') return r.active && r.status !== 'CONFIRMED';
      if (tab === 'FILLING') return r.status === 'FILLING';
      if (tab === 'CONFIRMED') return r.status === 'CONFIRMED';
      return true;
    }).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    const counts = {
      ACTIVE: rows.filter(r => r.active && r.status !== 'CONFIRMED').length,
      FILLING: rows.filter(r => r.status === 'FILLING').length,
      CONFIRMED: rows.filter(r => r.status === 'CONFIRMED').length,
    };

    const venues = await Venue.find({}).select('name city').sort({ name: 1 }).lean();

    return NextResponse.json({
      games: filtered,
      counts,
      venues: venues.map(v => ({ id: v._id.toString(), name: v.name, city: v.city })),
    });
  } catch (error) {
    console.error('[GET /api/admin/games]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
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
      const docs = await Booking.find({ ...filter, status: { $ne: 'CANCELLED' } });
      for (const doc of docs) {
        await applyCancellation(doc, { cancelledBy: 'ADMIN', reason: 'Game cancelled by admin' });
        await doc.save();
      }
    }

    return NextResponse.json({ ok: true, action });
  } catch (error) {
    console.error('[PATCH /api/admin/games]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
