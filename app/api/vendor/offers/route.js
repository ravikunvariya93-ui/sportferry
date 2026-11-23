import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import VendorOffer from '@/models/VendorOffer';
import { auth } from '@/lib/auth';
import { requireVendor } from '@/lib/vendorAuth';
import { normalizeOffer } from '@/lib/offers';

export async function GET() {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const offers = await VendorOffer.find({ vendor: session.user.id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ offers: offers.map(o => ({ ...o, _id: o._id.toString(), id: o._id.toString() })) });
  } catch (error) {
    console.error('[GET /api/vendor/offers]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
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
    return NextResponse.json({ offer: { ...offer.toObject(), id: offer._id.toString() } }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/vendor/offers]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
