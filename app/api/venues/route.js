import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';
import { normalizeCoords } from '@/lib/geo';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'VENDOR') {
      return NextResponse.json({ message: 'Only vendors can register venues.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, city, area, address, sportTypes, pricePerHour, discountPercent, numberOfTurfs, amenities, images, imageUrl, lat, lng } = body;

    if (!name || !city || !area || !address || !sportTypes?.length || !pricePerHour) {
      return NextResponse.json({ message: 'All required fields must be filled.' }, { status: 400 });
    }

    await dbConnect();

    const venue = await Venue.create({
      name: name.trim(),
      city: city.trim(),
      area: area.trim(),
      address: address.trim(),
      sportTypes,
      pricePerHour: Number(pricePerHour),
      discountPercent: Math.min(90, Math.max(0, Math.round(Number(discountPercent)) || 0)),
      numberOfTurfs: Math.max(1, Math.floor(Number(numberOfTurfs)) || 1),
      amenities: amenities || [],
      images: Array.isArray(images) && images.length ? images.filter(Boolean).slice(0, 6) : (imageUrl ? [imageUrl] : []),
      location: normalizeCoords(lat, lng),
      owner: session.user.id,
    });

    return NextResponse.json({ venueId: venue._id.toString() }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/venues]', error);
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
