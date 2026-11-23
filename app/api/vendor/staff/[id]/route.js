import { NextResponse } from 'next/server';
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
    for (const key of ['name', 'email', 'phone', 'role', 'access']) {
      if (body[key] !== undefined) member[key] = String(body[key]).trim().slice(0, 120);
    }
    if (body.active !== undefined) member.active = Boolean(body.active);
    await member.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[PATCH /api/vendor/staff/[id]]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
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
    console.error('[DELETE /api/vendor/staff/[id]]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
