import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { apiError } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Staff from '@/models/Staff';
import { auth, hasRole } from '@/lib/auth';
import { isValidObjectId } from '@/lib/vendorAuth';

export async function PATCH(request, { params }) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    if (!isValidObjectId(params.id)) return NextResponse.json({ message: 'Invalid id.' }, { status: 400 });
    await dbConnect();
    const staff = await Staff.findById(params.id);
    if (!staff) return NextResponse.json({ message: 'Staff not found.' }, { status: 404 });
    const body = await request.json();
    for (const key of ['name', 'email', 'phone', 'role']) {
      if (body[key] !== undefined) staff[key] = String(body[key]).trim().slice(0, 80);
    }
    if (body.active !== undefined) staff.active = Boolean(body.active);
    await staff.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'PATCH /api/admin/staff/[id]');
  }
}

export async function DELETE(request, { params }) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    if (!isValidObjectId(params.id)) return NextResponse.json({ message: 'Invalid id.' }, { status: 400 });
    await dbConnect();
    await Staff.deleteOne({ _id: params.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'DELETE /api/admin/staff/[id]');
  }
}
