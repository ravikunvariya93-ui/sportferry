import { NextResponse } from 'next/server';
import { requireVendorSession } from '@/lib/apiGuards';
import { apiError, forbidden, notFound, badRequest } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';

import { SPORT_TYPES } from '@/lib/constants';
import { ownedVenue } from '@/lib/vendorAuth';

const numOrNull = (v) => {
  if (v === null || v === '' || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

export async function PATCH(request, { params }) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();

    await dbConnect();
    const venue = await ownedVenue(session, params.id, { lean: false });
    if (!venue) return notFound('Venue not found.');

    const body = await request.json();

    if (body.name !== undefined) {
      if (!String(body.name).trim()) return badRequest('Venue name is required.');
      venue.name = String(body.name).trim().slice(0, 60);
    }
    if (body.city !== undefined) venue.city = String(body.city).trim();
    if (body.area !== undefined) venue.area = String(body.area).trim();
    if (body.address !== undefined) venue.address = String(body.address).trim();
    if (body.sportTypes !== undefined) {
      const sports = (Array.isArray(body.sportTypes) ? body.sportTypes : []).filter(s => SPORT_TYPES.includes(s));
      if (!sports.length) return badRequest('Pick at least one valid sport.');
      venue.sportTypes = sports;
    }
    if (body.amenities !== undefined) {
      venue.amenities = (Array.isArray(body.amenities) ? body.amenities : []).map(a => String(a).trim()).filter(Boolean).slice(0, 30);
    }
    if (body.images !== undefined) {
      venue.images = (Array.isArray(body.images) ? body.images : []).filter(Boolean).slice(0, 6);
    }
    if (body.discountPercent !== undefined) {
      venue.discountPercent = Math.min(90, Math.max(0, Math.round(Number(body.discountPercent)) || 0));
    }
    if (body.pricing !== undefined) {
      const p = body.pricing || {};
      const pricing = { weekday: numOrNull(p.weekday), weekend: numOrNull(p.weekend), peak: numOrNull(p.peak) };
      // A venue must still have a base rate; keep pricePerHour as the weekday mirror.
      const weekday = pricing.weekday ?? pricing.weekend;
      if (!weekday || weekday <= 0) {
        return badRequest('A weekday price is required.');
      }
      venue.pricing = pricing;
      venue.pricePerHour = weekday;
    }
    if (body.documents !== undefined) {
      const d = body.documents || {};
      venue.documents = {
        businessIdProof: String(d.businessIdProof || '').slice(0, 500),
        businessProof: String(d.businessProof || '').slice(0, 500),
        venueProof: String(d.venueProof || '').slice(0, 500),
      };
    }

    await venue.save();
    return NextResponse.json({ venueId: venue._id.toString() });
  } catch (error) {
    return apiError(error, 'PATCH /api/vendor/venue/[id]');
  }
}
