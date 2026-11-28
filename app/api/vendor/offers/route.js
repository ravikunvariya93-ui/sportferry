import { NextResponse } from 'next/server';
import { requireVendorSession } from '@/lib/apiGuards';
import { apiError, forbidden, badRequest } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import VendorOffer from '@/models/VendorOffer';


import { normalizeOffer } from '@/lib/offers';
import { serializeDoc, serializeList } from '@/lib/serialize';

export async function GET() {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();
    await dbConnect();
    const offers = await VendorOffer.find({ vendor: session.user.id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ offers: serializeList(offers, { keepLegacyId: true }) });
  } catch (error) {
    return apiError(error, 'GET /api/vendor/offers');
  }
}

export async function POST(request) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();
    const parsed = normalizeOffer(await request.json(), { vendorId: session.user.id });
    if (parsed.error) return badRequest(parsed.error);
    await dbConnect();
    const offer = await VendorOffer.create(parsed.value);
    return NextResponse.json({ offer: serializeDoc(offer, { keepLegacyId: true }) }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/vendor/offers');
  }
}
