import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Turf from '@/models/Turf';
import { auth } from '@/lib/auth';
import { SPORT_TYPES } from '@/lib/constants';
import { loadTurfs, nextTurfOrder, syncVenueTurfCount } from '@/lib/turfs';
import { requireVendor, ownedVenue } from '@/lib/vendorAuth';

function parseSize(size) {
  const length = Math.max(0, Math.floor(Number(size?.length)) || 0);
  const width = Math.max(0, Math.floor(Number(size?.width)) || 0);
  const unit = ['Feet', 'Metres'].includes(size?.unit) ? size.unit : 'Feet';
  return { length, width, unit };
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    await dbConnect();

    const venue = await ownedVenue(session, searchParams.get('venueId'));
    if (!venue) return NextResponse.json({ message: 'Venue not found.' }, { status: 404 });

    const turfs = await loadTurfs(venue._id);
    return NextResponse.json({
      turfs: turfs.map(t => ({ ...t, _id: t._id.toString(), venue: t.venue.toString(), id: t._id.toString() })),
    });
  } catch (error) {
    console.error('[GET /api/vendor/turfs]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { venueId, name, sport, size, surface, playingFormat, lighting } = body;

    await dbConnect();
    const venue = await ownedVenue(session, venueId);
    if (!venue) return NextResponse.json({ message: 'Venue not found.' }, { status: 404 });

    if (!name?.trim()) return NextResponse.json({ message: 'Turf name is required.' }, { status: 400 });
    if (!SPORT_TYPES.includes(sport)) return NextResponse.json({ message: 'Invalid sport.' }, { status: 400 });

    const order = await nextTurfOrder(venue._id);
    const turf = await Turf.create({
      venue: venue._id,
      name: name.trim(),
      sport,
      size: parseSize(size),
      surface: surface?.trim() || 'Synthetic Turf',
      playingFormat: playingFormat?.trim() || '',
      lighting: lighting !== false,
      order,
    });
    await syncVenueTurfCount(venue._id);

    return NextResponse.json({ turf: { ...turf.toObject(), _id: turf._id.toString(), id: turf._id.toString() } }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/vendor/turfs]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
