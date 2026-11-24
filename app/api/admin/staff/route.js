import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { apiError } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Staff from '@/models/Staff';
import { auth, hasRole } from '@/lib/auth';
import { serializeDoc, serializeList } from '@/lib/serialize';

export async function GET() {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const staff = await Staff.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ staff: serializeList(staff, { keepLegacyId: true }) });
  } catch (error) {
    return apiError(error, 'GET /api/admin/staff');
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
    return NextResponse.json({ staff: serializeDoc(staff, { keepLegacyId: true }) }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/admin/staff');
  }
}
