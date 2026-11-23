import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import Turf from '@/models/Turf';
import User from '@/models/User';
import { auth } from '@/lib/auth';
import { syncVenueTurfCount } from '@/lib/turfs';
import { normalizeOnboarding } from '@/lib/onboarding';
import { requireVendor, ownedVenue } from '@/lib/vendorAuth';

/**
 * Owner onboarding submit. Creates (or updates) a venue, its turfs, amenities,
 * documents and the owner's bank details, then moves the venue to PENDING for
 * admin approval.
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!(await requireVendor(session))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = normalizeOnboarding(body);
    if (parsed.error) return NextResponse.json({ message: parsed.error }, { status: 400 });
    const { venue, turfs, bank } = parsed.value;

    await dbConnect();

    let existing = null;
    if (body.venueId) {
      existing = await ownedVenue(session, body.venueId, { lean: false });
      if (!existing) return NextResponse.json({ message: 'Venue not found.' }, { status: 404 });
    }

    let venueDoc;
    if (existing) {
      Object.assign(existing, venue);
      venueDoc = await existing.save();
    } else {
      venueDoc = await Venue.create({ ...venue, owner: session.user.id });
    }

    // A fresh onboarding has no bookings, so a full turf replace is safe.
    await Turf.deleteMany({ venue: venueDoc._id });
    await Turf.insertMany(turfs.map((t) => ({ ...t, venue: venueDoc._id })));
    await syncVenueTurfCount(venueDoc._id);

    if (Object.values(bank).some(Boolean)) {
      await User.updateOne({ _id: session.user.id }, { $set: { bankDetails: bank } });
    }

    return NextResponse.json({ venueId: venueDoc._id.toString(), onboardingStatus: 'PENDING' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/vendor/onboarding]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
