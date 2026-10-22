import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import { auth, hasRole } from '@/lib/auth';
import { normalizeCoords } from '@/lib/geo';
import { slotStartInstant } from '@/lib/ist';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    await dbConnect();
    const venue = await Venue.findById(id).populate('owner', 'name');
    
    if (!venue) {
      return NextResponse.json({ message: 'Venue not found' }, { status: 404 });
    }

    return NextResponse.json(venue);
  } catch (error) {
    console.error('[GET /api/venues/[id]]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    await dbConnect();
    const venue = await Venue.findById(id);

    if (!venue) {
      return NextResponse.json({ message: 'Venue not found' }, { status: 404 });
    }

    // Check authorization: Owner or Admin
    const isAdmin = await hasRole(session, 'ADMIN');
    const isOwner = venue.owner.toString() === session.user.id;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, city, area, address, sportTypes, pricePerHour, discountPercent, numberOfTurfs, amenities, images, imageUrl, lat, lng } = body;

    // Validation
    if (!name || !city || !area || !address || !sportTypes?.length || !pricePerHour) {
      return NextResponse.json({ message: 'All required fields must be filled.' }, { status: 400 });
    }

    // A price must be a real, positive number — a negative price would flow
    // into the Razorpay order amount.
    const price = Number(pricePerHour);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ message: 'Price per hour must be a positive number.' }, { status: 400 });
    }

    // Update fields
    venue.name = name.trim();
    venue.city = city.trim();
    venue.area = area.trim();
    venue.address = address.trim();
    venue.sportTypes = sportTypes;
    venue.pricePerHour = price;
    if ('discountPercent' in body) {
      venue.discountPercent = Math.min(90, Math.max(0, Math.round(Number(discountPercent)) || 0));
    }
    venue.numberOfTurfs = Math.max(1, Math.floor(Number(numberOfTurfs)) || 1);
    venue.amenities = amenities || [];
    if ('lat' in body || 'lng' in body) {
      venue.location = normalizeCoords(lat, lng);
    }
    if (Array.isArray(images)) {
      venue.images = images.filter(Boolean).slice(0, 6);
    } else if (imageUrl) {
      venue.images = [imageUrl];
    }

    await venue.save();

    return NextResponse.json(venue);
  } catch (error) {
    console.error('[PATCH /api/venues/[id]]', error);
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    await dbConnect();
    const venue = await Venue.findById(id);

    if (!venue) {
      return NextResponse.json({ message: 'Venue not found' }, { status: 404 });
    }

    const isAdmin = await hasRole(session, 'ADMIN');
    const isOwner = venue.owner.toString() === session.user.id;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // Upcoming bookings must not vanish with the venue — players already paid
    // for them. Cancel (and refund) those first, then delete the venue.
    const Booking = (await import('@/models/Booking')).default;
    const now = new Date();
    const liveBookings = await Booking.find({
      venue: id,
      status: { $in: ['PENDING', 'CONFIRMED', 'PAYMENT_PENDING'] },
    });
    const upcoming = liveBookings.filter((b) => {
      const dateStr = new Date(b.date).toISOString().slice(0, 10);
      return slotStartInstant(dateStr, b.startTime) > now;
    });

    if (upcoming.length > 0) {
      return NextResponse.json(
        {
          message: `This venue still has ${upcoming.length} upcoming booking(s). Cancel them before deleting the venue.`,
          upcomingBookings: upcoming.length,
        },
        { status: 409 }
      );
    }

    // Past and cancelled bookings stay as history — the ticket page handles a
    // missing venue.
    await Booking.deleteMany({ venue: id, status: 'CANCELLED' });

    // Delete the venue
    await Venue.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Venue deleted successfully.' });
  } catch (error) {
    console.error('[DELETE /api/venues/[id]]', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

