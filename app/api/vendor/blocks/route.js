import { NextResponse } from 'next/server';
import { requireVendorSession } from '@/lib/apiGuards';
import { apiError, forbidden, notFound, badRequest, conflict } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import BlockedSlot from '@/models/BlockedSlot';
import Booking from '@/models/Booking';
import { parseBookableSlot, isValidDateISO, istTodayISO, istDateToUTC } from '@/lib/ist';
import { blocksForDate } from '@/lib/blockedSlots';
import { turfCountOf } from '@/lib/capacity';
import { ownedVenue, isValidObjectId } from '@/lib/vendorAuth';
import { serializeDoc, serializeList } from '@/lib/serialize';

const REASONS = ['MAINTENANCE', 'PRIVATE', 'TOURNAMENT'];

export async function GET(request) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    await dbConnect();
    const venue = await ownedVenue(session, searchParams.get('venueId'));
    if (!venue) return notFound('Venue not found.');
    if (!isValidDateISO(date)) return badRequest('A valid date (YYYY-MM-DD) is required.');

    const blocks = await blocksForDate(venue._id, date);
    return NextResponse.json({
      blocks: serializeList(blocks, { keepLegacyId: true }),
    });
  } catch (error) {
    return apiError(error, 'GET /api/vendor/blocks');
  }
}

export async function POST(request) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();

    const body = await request.json();
    const { venueId, date, slot, reason, note } = body;
    const turf = Math.max(1, Math.floor(Number(body.turf)) || 1);

    const times = parseBookableSlot(slot);
    if (!times || !isValidDateISO(date) || date < istTodayISO()) {
      return badRequest('A valid present or future date and 1-hour slot are required.');
    }

    await dbConnect();
    const venue = await ownedVenue(session, venueId);
    if (!venue) return notFound('Venue not found.');
    if (turf > turfCountOf(venue.numberOfTurfs)) {
      return badRequest('That turf does not exist at this venue.');
    }

    const booked = await Booking.countDocuments({
      venue: venue._id,
      turf,
      date: istDateToUTC(date),
      startTime: times.startTime,
      endTime: times.endTime,
      status: { $in: ['PENDING', 'CONFIRMED', 'PAYMENT_PENDING'] },
    });
    if (booked) {
      return conflict('Cancel the existing booking on this turf and slot before blocking it.');
    }

    const block = await BlockedSlot.create({
      venue: venue._id,
      turf,
      date: new Date(`${date}T00:00:00.000Z`),
      startTime: times.startTime,
      endTime: times.endTime,
      reason: REASONS.includes(reason) ? reason : 'MAINTENANCE',
      note: (note || '').slice(0, 200),
      createdBy: session.user.id,
    });

    return NextResponse.json({ block: serializeDoc(block, { keepLegacyId: true }) }, { status: 201 });
  } catch (error) {
    // Duplicate block for the same turf+slot is fine — treat it as success.
    if (error?.code === 11000) return NextResponse.json({ ok: true }, { status: 200 });
    return apiError(error, 'POST /api/vendor/blocks');
  }
}

export async function DELETE(request) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!isValidObjectId(id)) return badRequest('Invalid id.');

    await dbConnect();
    const block = await BlockedSlot.findById(id);
    if (!block) return notFound('Block not found.');
    const venue = await ownedVenue(session, block.venue);
    if (!venue) return notFound('Block not found.');

    await BlockedSlot.deleteOne({ _id: block._id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 'DELETE /api/vendor/blocks');
  }
}
