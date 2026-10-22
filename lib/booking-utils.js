import Booking from '@/models/Booking';
import { PLAYERS_PER_SIDE } from './capacity';

/**
 * Per-turf auto-confirm: a turf confirms once it holds 6 players in total,
 * whatever the split — 6v0, 4v2, 3v3 and 5v1 all confirm; 5v0 and 4v1 do not.
 */
export async function autoConfirmIfReady(venueId, bookingDate, startTime, endTime, turf, session) {
  const t = Math.max(1, Number(turf) || 1);

  const query = Booking.find({
    venue: venueId,
    date: bookingDate,
    startTime,
    endTime,
    turf: t,
    status: { $in: ['PENDING', 'CONFIRMED'] },
  });
  if (session) query.session(session);
  const slotBookings = await query.lean();

  const team1Count = slotBookings.filter(b => b.teamSide === 1).reduce((s, b) => s + b.playersCount, 0);
  const team2Count = slotBookings.filter(b => b.teamSide === 2).reduce((s, b) => s + b.playersCount, 0);

  // Six players on the turf make a match — the split between the sides
  // (4 and 2, 6 and 0, 3 and 3 …) does not matter.
  if (team1Count + team2Count >= PLAYERS_PER_SIDE) {
    await Booking.updateMany(
      {
        venue: venueId,
        date: bookingDate,
        startTime,
        endTime,
        turf: t,
        status: 'PENDING',
      },
      { $set: { status: 'CONFIRMED' } },
      session ? { session } : undefined
    );
    return true;
  }
  return false;
}

/**
 * Delete bookings that have been in PAYMENT_PENDING for more than 15 minutes.
 */
export async function cleanupExpiredPayments(session) {
  const expiryTime = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago
  const query = Booking.deleteMany({
    status: 'PAYMENT_PENDING',
    createdAt: { $lt: expiryTime }
  });
  if (session) query.session(session);
  await query;
}
