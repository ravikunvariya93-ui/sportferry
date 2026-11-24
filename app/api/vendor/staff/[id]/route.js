import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import StaffMember from '@/models/StaffMember';
import { auth } from '@/lib/auth';
import { requireVendor, isValidObjectId } from '@/lib/vendorAuth';

async function owned(session, id) {
  if (!isValidObjectId(id)) return null;
  const member = await StaffMember.findOne({ _id: id, vendor: session.user.id });
  return member;
}

export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const member = await owned(session, params.id);
    if (!member) return NextResponse.json({ message: 'Staff member not found.' }, { status: 404 });

    const body = await request.json();
    if (body.role !== undefined && !['Manager', 'Operator', 'Viewer'].includes(body.role)) {
      return NextResponse.json({ message: 'Invalid role.' }, { status: 400 });
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
    const session = await auth();
    if (!(await requireVendor(session))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const member = await owned(session, params.id);
    if (!member) return NextResponse.json({ message: 'Staff member not found.' }, { status: 404 });
    await StaffMember.deleteOne({ _id: member._id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'DELETE /api/vendor/staff/[id]');
  }
}
