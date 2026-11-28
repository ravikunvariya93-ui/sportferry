import { NextResponse } from 'next/server';
import { requireVendorSession } from '@/lib/apiGuards';
import { apiError, forbidden, badRequest } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import StaffMember from '@/models/StaffMember';


import { serializeDoc, serializeList } from '@/lib/serialize';

export async function GET() {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();
    await dbConnect();
    const staff = await StaffMember.find({ vendor: session.user.id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ staff: serializeList(staff, { keepLegacyId: true, extra: { vendor: session.user.id } }) });
  } catch (error) {
    return apiError(error, 'GET /api/vendor/staff');
  }
}

export async function POST(request) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return badRequest('Name is required.');
    if (!['Manager', 'Operator', 'Viewer'].includes(body.role)) {
      return badRequest('Invalid role.');
    }
    await dbConnect();
    const member = await StaffMember.create({
      vendor: session.user.id,
      name,
      email: String(body.email || '').trim(),
      phone: String(body.phone || '').trim(),
      role: body.role,
      access: String(body.access || '').trim().slice(0, 120),
      active: body.active !== false,
    });
    return NextResponse.json({ staff: serializeDoc(member, { keepLegacyId: true, extra: { vendor: session.user.id } }) }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/vendor/staff');
  }
}
