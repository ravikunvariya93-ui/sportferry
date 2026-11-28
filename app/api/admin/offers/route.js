import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { apiError, forbidden, badRequest } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import VendorOffer from '@/models/VendorOffer';
import User from '@/models/User';
import { normalizeOffer } from '@/lib/offers';
import { serializeDoc } from '@/lib/serialize';

export async function GET() {
  try {
    if (!(await requireAdmin())) return forbidden();
    await dbConnect();
    const offers = await VendorOffer.find({}).populate('vendor', 'name').sort({ createdAt: -1 }).lean();
    return NextResponse.json({
      offers: offers.map(o => serializeDoc(o, { keepLegacyId: true, extra: { vendorName: o.vendor?.name || 'Platform' } })),
    });
  } catch (error) {
    return apiError(error, 'GET /api/admin/offers');
  }
}

export async function POST(request) {
  try {
    if (!(await requireAdmin())) return forbidden();
    const parsed = normalizeOffer(await request.json(), { vendorId: null, allowPlatform: true });
    if (parsed.error) return badRequest(parsed.error);
    await dbConnect();
    const offer = await VendorOffer.create(parsed.value);
    return NextResponse.json({ offer: serializeDoc(offer, { keepLegacyId: true }) }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/admin/offers');
  }
}
