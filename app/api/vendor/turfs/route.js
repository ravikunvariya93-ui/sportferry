import { NextResponse } from 'next/server';
import { requireVendorSession } from '@/lib/apiGuards';
import { apiError, forbidden, notFound, badRequest } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Turf from '@/models/Turf';
import { SPORT_TYPES } from '@/lib/constants';
import { loadTurfs, nextTurfOrder, syncVenueTurfCount } from '@/lib/turfs';
import { ownedVenue } from '@/lib/vendorAuth';
import { serializeDoc, serializeList } from '@/lib/serialize';

function parseSize(size) {
  const length = Math.max(0, Math.floor(Number(size?.length)) || 0);
  const width = Math.max(0, Math.floor(Number(size?.width)) || 0);
  const unit = ['Feet', 'Metres'].includes(size?.unit) ? size.unit : 'Feet';
  return { length, width, unit };
}

export async function GET(request) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();

    const { searchParams } = new URL(request.url);
    await dbConnect();

    const venue = await ownedVenue(session, searchParams.get('venueId'));
    if (!venue) return notFound('Venue not found.');

    const turfs = await loadTurfs(venue._id);
    return NextResponse.json({
      turfs: serializeList(turfs, { keepLegacyId: true, extra: { venue: venue._id.toString() } }),
    });
  } catch (error) {
    return apiError(error, 'GET /api/vendor/turfs');
  }
}

export async function POST(request) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();

    const body = await request.json();
    const { venueId, name, sport, size, surface, playingFormat, lighting } = body;

    await dbConnect();
    const venue = await ownedVenue(session, venueId);
    if (!venue) return notFound('Venue not found.');

    if (!name?.trim()) return badRequest('Turf name is required.');
    if (!SPORT_TYPES.includes(sport)) return badRequest('Invalid sport.');

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

    return NextResponse.json({ turf: serializeDoc(turf, { keepLegacyId: true, extra: { venue: venue._id.toString() } }) }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/vendor/turfs');
  }
}
