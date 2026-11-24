import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { apiError } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import VendorOffer from '@/models/VendorOffer';
import { auth, hasRole } from '@/lib/auth';
import { isValidObjectId } from '@/lib/vendorAuth';
import { normalizeOffer } from '@/lib/offers';

export async function PATCH(request, { params }) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    if (!isValidObjectId(params.id)) return NextResponse.json({ message: 'Invalid id.' }, { status: 400 });
    const body = await request.json();
    await dbConnect();
    const offer = await VendorOffer.findById(params.id);
    if (!offer) return NextResponse.json({ message: 'Offer not found.' }, { status: 404 });

    if (body.active !== undefined && Object.keys(body).length === 1) {
      offer.active = Boolean(body.active);
    } else {
      const parsed = normalizeOffer({ ...offer.toObject(), ...body }, { vendorId: offer.vendor || null, allowPlatform: true });
      if (parsed.error) return NextResponse.json({ message: parsed.error }, { status: 400 });
      Object.assign(offer, parsed.value);
    }
    await offer.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'PATCH /api/admin/offers/[id]');
  }
}

export async function DELETE(request, { params }) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    if (!isValidObjectId(params.id)) return NextResponse.json({ message: 'Invalid id.' }, { status: 400 });
    await dbConnect();
    await VendorOffer.deleteOne({ _id: params.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'DELETE /api/admin/offers/[id]');
  }
}
