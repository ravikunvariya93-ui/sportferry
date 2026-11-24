import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { apiError } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import PlatformSettings from '@/models/PlatformSettings';
import { COMMISSION_PERCENT } from '@/lib/constants';
import { auth, hasRole } from '@/lib/auth';

async function settingsDoc() {
  let doc = await PlatformSettings.findOne({});
  if (!doc) doc = await PlatformSettings.create({});
  return doc;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const doc = await settingsDoc();
    return NextResponse.json({ settings: doc.toObject(), commissionPercent: COMMISSION_PERCENT });
  } catch (error) {
    return apiError(error, 'GET /api/admin/settings');
  }
}

export async function PATCH(request) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    await dbConnect();
    const doc = await settingsDoc();
    for (const group of ['rules', 'general', 'automation']) {
      for (const [key, value] of Object.entries(body[group] || {})) {
        if (key in doc[group]) doc[group][key] = typeof doc[group][key] === 'boolean' ? Boolean(value) : String(value).slice(0, 200);
      }
    }
    await doc.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'PATCH /api/admin/settings');
  }
}
