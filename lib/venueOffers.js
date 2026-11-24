import dbConnect from './mongodb';
import VendorOffer from '@/models/VendorOffer';
import Venue from '@/models/Venue';

/**
 * Attach active venue/platform offers to a list of public venue DTOs so card
 * prices use the same rate function as checkout. Dates are serialised for the
 * server → client boundary.
 */
export async function attachActiveOffers(venues = []) {
  if (!venues.length) return venues;
  await dbConnect();
  const ownerIds = [...new Set(venues.map(v => String(v.owner || '')).filter(Boolean))];
  const offers = await VendorOffer.find({
    $or: [{ vendor: { $in: ownerIds } }, { vendor: null }],
    active: true,
  }).lean();

  const serialized = offers.map(o => ({
    ...o,
    _id: o._id.toString(),
    vendor: o.vendor ? o.vendor.toString() : null,
    validFrom: o.validFrom ? new Date(o.validFrom).toISOString() : null,
    validTo: o.validTo ? new Date(o.validTo).toISOString() : null,
  }));

  return venues.map(v => ({
    ...v,
    offers: serialized.filter(o => o.vendor === null || o.vendor === String(v.owner || '')),
  }));
}

export async function loadPricedVenue(venueId) {
  await dbConnect();
  const venue = await Venue.findById(venueId).lean();
  if (!venue) return null;
  const [priced] = await attachActiveOffers([{
    ...venue,
    _id: venue._id.toString(),
    owner: venue.owner ? venue.owner.toString() : '',
    id: venue._id.toString(),
  }]);
  return priced;
}
