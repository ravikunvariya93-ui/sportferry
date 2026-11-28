import { NextResponse } from 'next/server';
import { requireVendorSession } from '@/lib/apiGuards';
import { apiError, forbidden } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import VendorSettings from '@/models/VendorSettings';
import Venue from '@/models/Venue';



async function settingsFor(session) {
  let doc = await VendorSettings.findOne({ vendor: session.user.id });
  if (!doc) doc = await VendorSettings.create({ vendor: session.user.id });
  return doc;
}

export async function GET() {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();
    await dbConnect();
    const doc = await settingsFor(session);
    const venue = await Venue.findOne({ owner: session.user.id }).select('name').lean();
    return NextResponse.json({
      settings: {
        notifications: doc.notifications,
        general: { ...doc.general, venueName: doc.general.venueName || venue?.name || '' },
      },
    });
  } catch (error) {
    return apiError(error, 'GET /api/vendor/settings');
  }
}

export async function PATCH(request) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();
    const body = await request.json();
    await dbConnect();
    const doc = await settingsFor(session);
    for (const key of ['sms', 'email', 'slotFill', 'reminders']) {
      if (body.notifications?.[key] !== undefined) doc.notifications[key] = Boolean(body.notifications[key]);
    }
    for (const key of ['venueName', 'timezone', 'currency']) {
      if (body.general?.[key] !== undefined) doc.general[key] = String(body.general[key]).trim().slice(0, 80);
    }
    await doc.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'PATCH /api/vendor/settings');
  }
}
