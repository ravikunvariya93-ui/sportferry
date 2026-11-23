import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SupportTicket from '@/models/SupportTicket';
import { auth, hasRole } from '@/lib/auth';

async function requireAdmin() {
  const session = await auth();
  if (!session || !(await hasRole(session, 'ADMIN'))) return null;
  return session;
}

export async function GET(request) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const status = new URL(request.url).searchParams.get('status') || '';
    await dbConnect();
    const query = status ? { status } : {};
    const tickets = await SupportTicket.find(query)
      .populate('createdBy', 'name email')
      .populate('venue', 'name city')
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({
      tickets: tickets.map(t => ({
        id: t._id.toString(),
        subject: t.subject,
        body: t.body,
        priority: t.priority,
        status: t.status,
        createdBy: t.createdBy?._id?.toString() || null,
        createdByName: t.createdBy?.name || 'Unknown',
        createdByEmail: t.createdBy?.email || '',
        venueName: t.venue?.name || '',
        replies: t.replies || [],
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('[GET /api/admin/tickets]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const { ticketId, status, reply, author } = await request.json();
    if (!ticketId) return NextResponse.json({ message: 'ticketId is required.' }, { status: 400 });
    await dbConnect();
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) return NextResponse.json({ message: 'Ticket not found.' }, { status: 404 });
    if (status) ticket.status = status;
    if (reply?.trim()) ticket.replies.push({ author: author || 'Admin', body: String(reply).trim().slice(0, 2000) });
    await ticket.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[PATCH /api/admin/tickets]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
