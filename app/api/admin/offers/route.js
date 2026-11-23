import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import VendorOffer from '@/models/VendorOffer';
import User from '@/models/User';
import { auth, hasRole } from '@/lib/auth';
import { normalizeOffer } from '@/lib/offers';

async function requireAdmin() {
  const session = await auth();
  if (!session || !(await hasRole(session, 'ADMIN'))) return null;
  return session;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const offers = await VendorOffer.find({}).populate('vendor', 'name').sort({ createdAt: -1 }).lean();
    return NextResponse.json({
      offers: offers.map(o => ({ ...o, _id: o._id.toString(), id: o._id.toString(), vendorName: o.vendor?.name || 'Platform' })),
    });
  } catch (error) {
    console.error('[GET /api/admin/offers]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const parsed = normalizeOffer(await request.json(), { vendorId: null, allowPlatform: true });
    if (parsed.error) return NextResponse.json({ message: parsed.error }, { status: 400 });
    await dbConnect();
    const offer = await VendorOffer.create(parsed.value);
    return NextResponse.json({ offer: { ...offer.toObject(), id: offer._id.toString() } }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/offers]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
