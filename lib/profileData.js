import dbConnect from './mongodb';
import UserDoc from '@/models/User';
import Booking from '@/models/Booking';
import { hoursUntilSlot } from './cancellationPolicy';
import { getPlayerLevel, getAchievements } from './playerLevel';

/**
 * Load a player's public profile: identity, level and stats derived from their
 * (non-cancelled) bookings. Shared by the public profile page and the admin
 * user-profile view so the two never drift apart.
 * Returns null when the id is malformed or no user exists.
 */
export async function getPlayerProfileData(userId) {
  await dbConnect();

  let user = null;
  try {
    user = await UserDoc.findById(userId).lean();
  } catch {
    user = null; // malformed ObjectId
  }
  if (!user) return null;

  const bookings = await Booking.find({
    user: user._id,
    status: { $nin: ['PAYMENT_PENDING', 'CANCELLED'] },
  })
    .populate('venue', 'name city area')
    .lean();

  const now = new Date();
  let gamesPlayed = 0;
  let upcoming = 0;
  const venueSet = new Set();
  for (const b of bookings) {
    if (hoursUntilSlot(b, now) > 0) upcoming += 1;
    else gamesPlayed += 1;
    if (b.venue?._id) venueSet.add(b.venue._id.toString());
  }
  const venues = venueSet.size;
  const memberMonths = Math.max(
    0,
    Math.floor((now.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  );

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      username: user.username || '',
      email: user.email || '',
      city: user.city || '',
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
    level: getPlayerLevel(gamesPlayed),
    achievements: getAchievements({ gamesPlayed, upcoming, venues, memberMonths }),
    stats: { gamesPlayed, upcoming, venues },
  };
}
