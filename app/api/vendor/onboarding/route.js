import { NextResponse } from 'next/server';
import { requireVendorSession } from '@/lib/apiGuards';
import { apiError, forbidden, badRequest, notFound, conflict } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import Turf from '@/models/Turf';
import Booking from '@/models/Booking';
import User from '@/models/User';
import { syncVenueTurfCount } from '@/lib/turfs';
import { normalizeOnboarding } from '@/lib/onboarding';
import { ownedVenue } from '@/lib/vendorAuth';

/**
 * Owner onboarding submit. Creates (or updates) a venue, its turfs, amenities,
 * documents and the owner's bank details, then moves the venue to PENDING for
 * admin approval.
 */
export async function POST(request) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();

    const body = await request.json();
    const parsed = normalizeOnboarding(body);
    if (parsed.error) return badRequest(parsed.error);
    const { venue, turfs, bank } = parsed.value;

    await dbConnect();

    let existing = null;
    if (body.venueId) {
      existing = await ownedVenue(session, body.venueId, { lean: false });
      if (!existing) return notFound('Venue not found.');
      // Re-submitting a live venue would replace its turfs (breaking booked turf
      // indexes) and send it back to PENDING, delisting it from Explore.
      const booked = await Booking.countDocuments({ venue: existing._id });
      if (booked || existing.onboardingStatus === 'ACTIVE') {
        return conflict('This venue is already live. Use Grounds & Courts and Pricing & Rules to edit it.');
      }
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

    return NextResponse.json({ venueId: venueDoc._id.toString(), onboardingStatus: venueDoc.onboardingStatus }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/vendor/onboarding');
  }
}
