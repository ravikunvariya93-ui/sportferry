import Venue from '@/models/Venue';
import { hasRole } from '@/lib/auth';

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export const isValidObjectId = (id) => OBJECT_ID_RE.test(String(id || ''));

/** Returns the session when it holds VENDOR, otherwise null. */
export async function requireVendor(session) {
  if (!session || !(await hasRole(session, 'VENDOR'))) return null;
  return session;
}

/** The venue document when it belongs to this vendor, otherwise null. */
export async function ownedVenue(session, venueId, { lean = true } = {}) {
  if (!isValidObjectId(venueId)) return null;
  const query = Venue.findOne({ _id: venueId, owner: session.user.id });
  return lean ? query.lean() : query;
}
