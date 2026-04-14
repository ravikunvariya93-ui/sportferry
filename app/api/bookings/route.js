import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';

/**
 * Parse a slot label like "06:00 AM – 07:00 AM" into 24-hour startTime / endTime strings.
 */
function parseSlot(slot) {
  const parts = slot.split('–').map((s) => s.trim());
  if (parts.length !== 2) return null;

  function to24h(timeStr) {
    const [time, meridiem] = timeStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return { startTime: to24h(parts[0]), endTime: to24h(parts[1]) };
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'You must be logged in to book.' }, { status: 401 });
    }

    const body = await request.json();
    const { venueId, date, slot, bookingType = 'ONLINE', offlineCustomerName, offlineCustomerPhone } = body;

    if (!venueId || !date || !slot) {
      return NextResponse.json({ message: 'venueId, date, and slot are required.' }, { status: 400 });
    }

    const times = parseSlot(slot);
    if (!times) {
      return NextResponse.json({ message: 'Invalid slot format.' }, { status: 400 });
    }

    await dbConnect();

    const venue = await Venue.findById(venueId).lean();
    if (!venue) {
      return NextResponse.json({ message: 'Venue not found.' }, { status: 404 });
    }

    // Security check for offline bookings: only the owner can block slots
    if (bookingType === 'OFFLINE' && venue.owner.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Only venue owners can create offline bookings.' }, { status: 403 });
    }

    // Check for duplicate booking on same venue/date/slot
    const existing = await Booking.findOne({
      venue: venueId,
      date: new Date(date),
      startTime: times.startTime,
      endTime: times.endTime,
      status: { $ne: 'CANCELLED' },
    });

    if (existing) {
      return NextResponse.json(
        { message: 'This slot is already booked. Please choose another.' },
        { status: 409 }
      );
    }

    const booking = await Booking.create({
      venue: venueId,
      user: bookingType === 'ONLINE' ? session.user.id : null,
      date: new Date(date),
      startTime: times.startTime,
      endTime: times.endTime,
      totalAmount: venue.pricePerHour,
      status: bookingType === 'OFFLINE' ? 'CONFIRMED' : 'PENDING',
      bookingType,
      offlineCustomerName: bookingType === 'OFFLINE' ? (offlineCustomerName || 'Manual Block') : undefined,
      offlineCustomerPhone,
    });

    return NextResponse.json({ bookingId: booking._id.toString() }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/bookings]', error);
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
