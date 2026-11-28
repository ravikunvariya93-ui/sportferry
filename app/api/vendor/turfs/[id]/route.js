import { NextResponse } from 'next/server';
import { requireVendorSession } from '@/lib/apiGuards';
import { apiError, forbidden, notFound, badRequest } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Turf from '@/models/Turf';
import Booking from '@/models/Booking';

import { SPORT_TYPES } from '@/lib/constants';
import { syncVenueTurfCount } from '@/lib/turfs';
import { ownedVenue, isValidObjectId } from '@/lib/vendorAuth';

async function ownedTurf(session, turfId) {
  if (!isValidObjectId(turfId)) return null;
  const turf = await Turf.findById(turfId);
  if (!turf) return null;
  const venue = await ownedVenue(session, turf.venue);
  return venue ? turf : null;
}

export async function PATCH(request, { params }) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();

    await dbConnect();
    const turf = await ownedTurf(session, params.id);
    if (!turf) return notFound('Turf not found.');

    const body = await request.json();
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return badRequest('Turf name cannot be empty.');
      turf.name = String(body.name).trim();
    }
    if (body.sport !== undefined) {
      if (!SPORT_TYPES.includes(body.sport)) return badRequest('Invalid sport.');
      turf.sport = body.sport;
    }
    if (body.size !== undefined) {
      turf.size = {
        length: Math.max(0, Math.floor(Number(body.size.length)) || 0),
        width: Math.max(0, Math.floor(Number(body.size.width)) || 0),
        unit: ['Feet', 'Metres'].includes(body.size.unit) ? body.size.unit : 'Feet',
      };
    }
    if (body.surface !== undefined) turf.surface = String(body.surface).trim() || 'Synthetic Turf';
    if (body.playingFormat !== undefined) turf.playingFormat = String(body.playingFormat).trim();
    if (body.lighting !== undefined) turf.lighting = Boolean(body.lighting);
    if (body.isActive !== undefined) turf.isActive = Boolean(body.isActive);

    await turf.save();
    return NextResponse.json({ turf: { ...turf.toObject(), _id: turf._id.toString(), id: turf._id.toString() } });
  } catch (error) {
    return apiError(error, 'PATCH /api/vendor/turfs/[id]');
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();

    await dbConnect();
    const turf = await ownedTurf(session, params.id);
    if (!turf) return notFound('Turf not found.');

    // A booking's `turf` is the turf's index. Removing or renumbering a turf
    // after bookings exist would silently re-point their history, so a venue
    // with any booking keeps a fixed turf grid.
    const bookingCount = await Booking.countDocuments({ venue: turf.venue });
    if (bookingCount > 0) {
      return NextResponse.json(
        { message: 'This venue already has bookings — turfs can no longer be removed.' },
        { status: 409 }
      );
    }

    await Turf.deleteOne({ _id: turf._id });

    // Compact the remaining indexes to 1..N.
    const remaining = await Turf.find({ venue: turf.venue }).sort({ order: 1 });
    await Promise.all(remaining.map((t, i) => {
      if (t.order !== i + 1) { t.order = i + 1; return t.save(); }
      return null;
    }));
    await syncVenueTurfCount(turf.venue);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'DELETE /api/vendor/turfs/[id]');
  }
}
