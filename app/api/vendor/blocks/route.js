import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import BlockedSlot from '@/models/BlockedSlot';
import Booking from '@/models/Booking';
import { auth } from '@/lib/auth';
import { parseBookableSlot, isValidDateISO, istTodayISO, istDateToUTC } from '@/lib/ist';
import { blocksForDate } from '@/lib/blockedSlots';
import { turfCountOf } from '@/lib/capacity';
import { requireVendor, ownedVenue, isValidObjectId } from '@/lib/vendorAuth';

const REASONS = ['MAINTENANCE', 'PRIVATE', 'TOURNAMENT'];

export async function GET(request) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    await dbConnect();
    const venue = await ownedVenue(session, searchParams.get('venueId'));
    if (!venue) return NextResponse.json({ message: 'Venue not found.' }, { status: 404 });
    if (!isValidDateISO(date)) return NextResponse.json({ message: 'A valid date (YYYY-MM-DD) is required.' }, { status: 400 });

    const blocks = await blocksForDate(venue._id, date);
    return NextResponse.json({
      blocks: blocks.map(b => ({ ...b, _id: b._id.toString(), id: b._id.toString() })),
    });
  } catch (error) {
    console.error('[GET /api/vendor/blocks]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { venueId, date, slot, reason, note } = body;
    const turf = Math.max(1, Math.floor(Number(body.turf)) || 1);

    const times = parseBookableSlot(slot);
    if (!times || !isValidDateISO(date) || date < istTodayISO()) {
      return NextResponse.json({ message: 'A valid present or future date and 1-hour slot are required.' }, { status: 400 });
    }

    await dbConnect();
    const venue = await ownedVenue(session, venueId);
    if (!venue) return NextResponse.json({ message: 'Venue not found.' }, { status: 404 });
    if (turf > turfCountOf(venue.numberOfTurfs)) {
      return NextResponse.json({ message: 'That turf does not exist at this venue.' }, { status: 400 });
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
      return NextResponse.json({ message: 'Cancel the existing booking on this turf and slot before blocking it.' }, { status: 409 });
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

    return NextResponse.json({ block: { ...block.toObject(), _id: block._id.toString(), id: block._id.toString() } }, { status: 201 });
  } catch (error) {
    // Duplicate block for the same turf+slot is fine — treat it as success.
    if (error?.code === 11000) return NextResponse.json({ ok: true }, { status: 200 });
    console.error('[POST /api/vendor/blocks]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!isValidObjectId(id)) return NextResponse.json({ message: 'Invalid id.' }, { status: 400 });

    await dbConnect();
    const block = await BlockedSlot.findById(id);
    if (!block) return NextResponse.json({ message: 'Block not found.' }, { status: 404 });
    const venue = await ownedVenue(session, block.venue);
    if (!venue) return NextResponse.json({ message: 'Block not found.' }, { status: 404 });

    await BlockedSlot.deleteOne({ _id: block._id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/vendor/blocks]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
