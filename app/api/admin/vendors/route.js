import { NextResponse } from 'next/server';
import { apiError, forbidden, badRequest, conflict } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import { auth, hasRole } from '@/lib/auth';

/** Create a VENDOR account + its first venue from the admin "Add Vendor" dialog. */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !(await hasRole(session, 'ADMIN'))) return forbidden();
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const ownerName = String(body.ownerName || '').trim();
    if (!name || !email || !ownerName) {
      return badRequest('Venue name, owner name and email are required.');
    }
    await dbConnect();
    const bcrypt = (await import('bcryptjs')).default;
    const UserModel = (await import('@/models/User')).default;
    const VenueModel = (await import('@/models/Venue')).default;
    const user = await UserModel.create({
      name: ownerName, email, username: String(body.username || email).trim(), role: 'VENDOR',
      password: body.password ? await bcrypt.hash(String(body.password), 10) : '',
      phone: String(body.phone || '').trim(), city: String(body.city || '').trim(),
    });
    const price = Math.max(0, Number(body.pricePerHour) || 0) || 1000;
    const sports = (Array.isArray(body.sportTypes) ? body.sportTypes : ['Box Cricket'])
      .filter(s => ['Box Cricket', 'Football', 'Tennis', 'Badminton', 'Basketball'].includes(s));
    const venue = await VenueModel.create({
      name, owner: user._id, city: String(body.city || '').trim() || 'Ahmedabad',
      area: String(body.area || '').trim() || '—', address: String(body.address || '').trim() || '—',
      sportTypes: sports.length ? sports : ['Box Cricket'],
      pricePerHour: price, pricing: { weekday: price, weekend: null, peak: null },
      numberOfTurfs: Math.max(1, Math.floor(Number(body.numberOfTurfs)) || 1),
      images: [], amenities: [], onboardingStatus: 'ACTIVE',
    });
    return NextResponse.json({ venueId: venue._id.toString(), ownerId: user._id.toString() }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) return conflict('Email already exists.');
    return apiError(error, 'POST /api/admin/vendors');
  }
}
