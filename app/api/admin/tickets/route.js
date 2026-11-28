import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { apiError, forbidden, badRequest, notFound } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import SupportTicket from '@/models/SupportTicket';


export async function GET(request) {
  try {
    if (!(await requireAdmin())) return forbidden();
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
    return apiError(error, 'GET /api/admin/tickets');
  }
}

export async function PATCH(request) {
  try {
    if (!(await requireAdmin())) return forbidden();
    const { ticketId, status, reply, author } = await request.json();
    if (!ticketId) return badRequest('ticketId is required.');
    await dbConnect();
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) return notFound('Ticket not found.');
    if (status) ticket.status = status;
    if (reply?.trim()) ticket.replies.push({ author: author || 'Admin', body: String(reply).trim().slice(0, 2000) });
    await ticket.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'PATCH /api/admin/tickets');
  }
}
