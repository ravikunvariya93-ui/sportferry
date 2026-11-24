import { auth, hasRole } from './auth';
import { requireVendor, isValidObjectId } from './vendorAuth';

export async function requireAdmin() {
  const session = await auth();
  if (!session || !(await hasRole(session, 'ADMIN'))) return null;
  return session;
}

export async function requireVendorSession() {
  const session = await auth();
  if (!(await requireVendor(session))) return null;
  return session;
}

export async function requireOwnedDoc({ model, id, session, ownerField = 'vendor', lean = false }) {
  if (!isValidObjectId(id) || !session) return null;
  const query = model.findOne({ _id: id, [ownerField]: session.user.id });
  return lean ? query.lean() : query;
}

export function parseObjectIdParam(raw) {
  return isValidObjectId(raw) ? raw : null;
}
