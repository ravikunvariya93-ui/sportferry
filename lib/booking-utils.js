import Booking from '@/models/Booking';

/**
 * Per-turf auto-confirm: if a single turf has >= 3 players on BOTH sides for a
 * slot, confirm all PENDING bookings on that turf+slot.
 */
export async function autoConfirmIfReady(venueId, bookingDate, startTime, endTime, turf, session) {
  const t = Math.max(1, Number(turf) || 1);

  const slotBookings = await Booking.find({
    venue: venueId,
    date: bookingDate,
    startTime,
    endTime,
    turf: t,
    status: { $in: ['PENDING', 'CONFIRMED'] },
  }).session(session).lean();

  const team1Count = slotBookings.filter(b => b.teamSide === 1).reduce((s, b) => s + b.playersCount, 0);
  const team2Count = slotBookings.filter(b => b.teamSide === 2).reduce((s, b) => s + b.playersCount, 0);

  if (team1Count >= 3 && team2Count >= 3) {
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
      { session }
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
