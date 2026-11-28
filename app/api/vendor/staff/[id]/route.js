import { NextResponse } from 'next/server';
import { requireVendorSession } from '@/lib/apiGuards';
import { apiError, forbidden, notFound, badRequest } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import StaffMember from '@/models/StaffMember';

import { isValidObjectId } from '@/lib/vendorAuth';

async function owned(session, id) {
  if (!isValidObjectId(id)) return null;
  const member = await StaffMember.findOne({ _id: id, vendor: session.user.id });
  return member;
}

export async function PATCH(request, { params }) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();
    await dbConnect();
    const member = await owned(session, params.id);
    if (!member) return notFound('Staff member not found.');

    const body = await request.json();
    if (body.role !== undefined && !['Manager', 'Operator', 'Viewer'].includes(body.role)) {
      return badRequest('Invalid role.');
    }
    for (const key of ['name', 'email', 'phone', 'role', 'access']) {
      if (body[key] !== undefined) member[key] = String(body[key]).trim().slice(0, 120);
    }
    if (body.active !== undefined) member.active = Boolean(body.active);
    await member.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'PATCH /api/vendor/staff/[id]');
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();
    await dbConnect();
    const member = await owned(session, params.id);
    if (!member) return notFound('Staff member not found.');
    await StaffMember.deleteOne({ _id: member._id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'DELETE /api/vendor/staff/[id]');
  }
}
