import { NextResponse } from 'next/server';
import { requireVendorSession } from '@/lib/apiGuards';
import { apiError, forbidden, badRequest } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import SupportTicket from '@/models/SupportTicket';
import Venue from '@/models/Venue';


import { serializeDoc, serializeList } from '@/lib/serialize';

export async function GET() {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();
    await dbConnect();
    const tickets = await SupportTicket.find({ createdBy: session.user.id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ tickets: serializeList(tickets, { keepLegacyId: true }) });
  } catch (error) {
    return apiError(error, 'GET /api/vendor/tickets');
  }
}

export async function POST(request) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();
    const body = await request.json();
    const subject = String(body.subject || '').trim();
    const text = String(body.body || '').trim();
    if (!subject || !text) return badRequest('A subject and message are required.');

    await dbConnect();
    const venue = await Venue.findOne({ owner: session.user.id }).select('_id').lean();
    const ticket = await SupportTicket.create({
      createdBy: session.user.id,
      venue: venue?._id || null,
      subject: subject.slice(0, 120),
      body: text.slice(0, 2000),
      priority: ['Low', 'Medium', 'High'].includes(body.priority) ? body.priority : 'Medium',
    });
    return NextResponse.json({ ticket: serializeDoc(ticket, { keepLegacyId: true }) }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/vendor/tickets');
  }
}
