import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { apiError, forbidden, badRequest, notFound } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import VendorOffer from '@/models/VendorOffer';

import { isValidObjectId } from '@/lib/vendorAuth';
import { normalizeOffer } from '@/lib/offers';

export async function PATCH(request, { params }) {
  try {
    if (!(await requireAdmin())) return forbidden();
    if (!isValidObjectId(params.id)) return badRequest('Invalid id.');
    const body = await request.json();
    await dbConnect();
    const offer = await VendorOffer.findById(params.id);
    if (!offer) return notFound('Offer not found.');

    if (body.active !== undefined && Object.keys(body).length === 1) {
      offer.active = Boolean(body.active);
    } else {
      const parsed = normalizeOffer({ ...offer.toObject(), ...body }, { vendorId: offer.vendor || null, allowPlatform: true });
      if (parsed.error) return badRequest(parsed.error);
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
    if (!(await requireAdmin())) return forbidden();
    if (!isValidObjectId(params.id)) return badRequest('Invalid id.');
    await dbConnect();
    await VendorOffer.deleteOne({ _id: params.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'DELETE /api/admin/offers/[id]');
  }
}
