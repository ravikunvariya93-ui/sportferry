import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import VendorOffer from '@/models/VendorOffer';
import { auth } from '@/lib/auth';
import { requireVendor } from '@/lib/vendorAuth';
import { normalizeOffer } from '@/lib/offers';
import { serializeDoc, serializeList } from '@/lib/serialize';

export async function GET() {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const offers = await VendorOffer.find({ vendor: session.user.id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ offers: serializeList(offers, { keepLegacyId: true }) });
  } catch (error) {
    return apiError(error, 'GET /api/vendor/offers');
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const parsed = normalizeOffer(await request.json(), { vendorId: session.user.id });
    if (parsed.error) return NextResponse.json({ message: parsed.error }, { status: 400 });
    await dbConnect();
    const offer = await VendorOffer.create(parsed.value);
    return NextResponse.json({ offer: serializeDoc(offer, { keepLegacyId: true }) }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/vendor/offers');
  }
}
