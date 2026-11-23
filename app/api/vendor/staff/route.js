import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StaffMember from '@/models/StaffMember';
import { auth } from '@/lib/auth';
import { requireVendor } from '@/lib/vendorAuth';

export async function GET() {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const staff = await StaffMember.find({ vendor: session.user.id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ staff: staff.map(s => ({ ...s, _id: s._id.toString(), id: s._id.toString(), vendor: String(s.vendor) })) });
  } catch (error) {
    console.error('[GET /api/vendor/staff]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ message: 'Name is required.' }, { status: 400 });
    if (!['Manager', 'Operator', 'Viewer'].includes(body.role)) {
      return NextResponse.json({ message: 'Invalid role.' }, { status: 400 });
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
    return NextResponse.json({ staff: { ...member.toObject(), id: member._id.toString() } }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/vendor/staff]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
