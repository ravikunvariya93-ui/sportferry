import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SupportTicket from '@/models/SupportTicket';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';
import { requireVendor } from '@/lib/vendorAuth';

export async function GET() {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const tickets = await SupportTicket.find({ createdBy: session.user.id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ tickets: tickets.map(t => ({ ...t, _id: t._id.toString(), id: t._id.toString() })) });
  } catch (error) {
    console.error('[GET /api/vendor/tickets]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    const subject = String(body.subject || '').trim();
    const text = String(body.body || '').trim();
    if (!subject || !text) return NextResponse.json({ message: 'A subject and message are required.' }, { status: 400 });

    await dbConnect();
    const venue = await Venue.findOne({ owner: session.user.id }).select('_id').lean();
    const ticket = await SupportTicket.create({
      createdBy: session.user.id,
      venue: venue?._id || null,
      subject: subject.slice(0, 120),
      body: text.slice(0, 2000),
      priority: ['Low', 'Medium', 'High'].includes(body.priority) ? body.priority : 'Medium',
    });
    return NextResponse.json({ ticket: { ...ticket.toObject(), id: ticket._id.toString() } }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/vendor/tickets]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
