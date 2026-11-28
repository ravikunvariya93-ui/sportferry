import { NextResponse } from 'next/server';
import { apiError, unauthorized, badRequest } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import { auth, hasRole } from '@/lib/auth';
import { normalizeCoords } from '@/lib/geo';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !(await hasRole(session, 'VENDOR'))) {
      return unauthorized('Only vendors can register venues.');
    }

    const body = await request.json();
    const { name, city, area, address, sportTypes, pricePerHour, discountPercent, numberOfTurfs, amenities, images, imageUrl, lat, lng } = body;

    if (!name || !city || !area || !address || !sportTypes?.length || !pricePerHour) {
      return badRequest('All required fields must be filled.');
    }

    // A price must be a real, positive number — a negative price would flow
    // into the Razorpay order amount.
    const price = Number(pricePerHour);
    if (!Number.isFinite(price) || price <= 0) {
      return badRequest('Price per hour must be a positive number.');
    }

    await dbConnect();

    const venue = await Venue.create({
      name: name.trim(),
      city: city.trim(),
      area: area.trim(),
      address: address.trim(),
      sportTypes,
      pricePerHour: price,
      discountPercent: Math.min(90, Math.max(0, Math.round(Number(discountPercent)) || 0)),
      numberOfTurfs: Math.max(1, Math.floor(Number(numberOfTurfs)) || 1),
      amenities: amenities || [],
      images: Array.isArray(images) && images.length ? images.filter(Boolean).slice(0, 6) : (imageUrl ? [imageUrl] : []),
      location: normalizeCoords(lat, lng),
      owner: session.user.id,
    });

    return NextResponse.json({ venueId: venue._id.toString() }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/venues', { message: 'Something went wrong. Please try again.' });
  }
}
