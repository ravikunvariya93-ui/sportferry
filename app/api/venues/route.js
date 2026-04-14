import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'VENDOR') {
      return NextResponse.json({ message: 'Only vendors can register venues.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, city, area, address, sportTypes, pricePerHour, amenities, imageUrl } = body;

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
      amenities: amenities || [],
      images: imageUrl ? [imageUrl] : [],
      owner: session.user.id,
    });

    return NextResponse.json({ venueId: venue._id.toString() }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/venues]', error);
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
