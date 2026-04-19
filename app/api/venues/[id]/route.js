import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';

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
    const isOwner = venue.owner.toString() === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, city, area, address, sportTypes, pricePerHour, amenities, imageUrl } = body;

    // Validation
    if (!name || !city || !area || !address || !sportTypes?.length || !pricePerHour) {
      return NextResponse.json({ message: 'All required fields must be filled.' }, { status: 400 });
    }

    // Update fields
    venue.name = name.trim();
    venue.city = city.trim();
    venue.area = area.trim();
    venue.address = address.trim();
    venue.sportTypes = sportTypes;
    venue.pricePerHour = Number(pricePerHour);
    venue.amenities = amenities || [];
    if (imageUrl) {
      venue.images = [imageUrl];
    }

    await venue.save();

    return NextResponse.json(venue);
  } catch (error) {
    console.error('[PATCH /api/venues/[id]]', error);
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
