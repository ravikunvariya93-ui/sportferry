import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import VendorOffer from '@/models/VendorOffer';
import { auth } from '@/lib/auth';
import { requireVendor, isValidObjectId } from '@/lib/vendorAuth';
import { normalizeOffer } from '@/lib/offers';

async function owned(session, id) {
  if (!isValidObjectId(id)) return null;
  return VendorOffer.findOne({ _id: id, vendor: session.user.id });
}

export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    await dbConnect();
    const offer = await owned(session, params.id);
    if (!offer) return NextResponse.json({ message: 'Offer not found.' }, { status: 404 });

    if (body.active !== undefined && Object.keys(body).length === 1) {
      offer.active = Boolean(body.active);
      await offer.save();
      return NextResponse.json({ ok: true });
    }

    const parsed = normalizeOffer({ ...offer.toObject(), ...body }, { vendorId: session.user.id });
    if (parsed.error) return NextResponse.json({ message: parsed.error }, { status: 400 });
    Object.assign(offer, parsed.value);
    await offer.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'PATCH /api/vendor/offers/[id]');
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const offer = await owned(session, params.id);
    if (!offer) return NextResponse.json({ message: 'Offer not found.' }, { status: 404 });
    await VendorOffer.deleteOne({ _id: offer._id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'DELETE /api/vendor/offers/[id]');
  }
}
