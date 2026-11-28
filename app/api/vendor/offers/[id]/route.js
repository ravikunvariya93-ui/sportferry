import { NextResponse } from 'next/server';
import { requireVendorSession } from '@/lib/apiGuards';
import { apiError, forbidden, notFound, badRequest } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import VendorOffer from '@/models/VendorOffer';

import { isValidObjectId } from '@/lib/vendorAuth';
import { normalizeOffer } from '@/lib/offers';

async function owned(session, id) {
  if (!isValidObjectId(id)) return null;
  return VendorOffer.findOne({ _id: id, vendor: session.user.id });
}

export async function PATCH(request, { params }) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();
    const body = await request.json();
    await dbConnect();
    const offer = await owned(session, params.id);
    if (!offer) return notFound('Offer not found.');

    if (body.active !== undefined && Object.keys(body).length === 1) {
      offer.active = Boolean(body.active);
      await offer.save();
      return NextResponse.json({ ok: true });
    }

    const parsed = normalizeOffer({ ...offer.toObject(), ...body }, { vendorId: session.user.id });
    if (parsed.error) return badRequest(parsed.error);
    Object.assign(offer, parsed.value);
    await offer.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'PATCH /api/vendor/offers/[id]');
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();
    await dbConnect();
    const offer = await owned(session, params.id);
    if (!offer) return notFound('Offer not found.');
    await VendorOffer.deleteOne({ _id: offer._id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'DELETE /api/vendor/offers/[id]');
  }
}
