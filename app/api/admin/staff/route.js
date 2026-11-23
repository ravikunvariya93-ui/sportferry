import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Staff from '@/models/Staff';
import { auth, hasRole } from '@/lib/auth';

async function requireAdmin() {
  const session = await auth();
  if (!session || !(await hasRole(session, 'ADMIN'))) return null;
  return session;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const staff = await Staff.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ staff: staff.map(s => ({ ...s, _id: s._id.toString(), id: s._id.toString() })) });
  } catch (error) {
    console.error('[GET /api/admin/staff]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ message: 'Name is required.' }, { status: 400 });
    await dbConnect();
    const staff = await Staff.create({
      name,
      email: String(body.email || '').trim(),
      phone: String(body.phone || '').trim(),
      role: ['Manager', 'Support', 'Operator', 'Viewer'].includes(body.role) ? body.role : 'Viewer',
      active: body.active !== false,
    });
    return NextResponse.json({ staff: { ...staff.toObject(), id: staff._id.toString() } }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/staff]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
