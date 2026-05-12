import Booking from '@/models/Booking';

/**
 * Parse a slot label like "06:00 AM – 07:00 AM" into 24-hour startTime / endTime strings.
 */
export function parseSlot(slot) {
  const parts = slot.split('–').map((s) => s.trim());
  if (parts.length !== 2) return null;

  function to24h(timeStr) {
    const [time, meridiem] = timeStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return { startTime: to24h(parts[0]), endTime: to24h(parts[1]) };
}

/**
 * Check if both teams have >= 3 players for a given slot.
 * If so, auto-confirm all PENDING bookings in that slot.
 */
export async function autoConfirmIfReady(venueId, bookingDate, startTime, endTime, session) {
  const slotBookings = await Booking.find({
    venue: venueId,
    date: bookingDate,
    startTime,
    endTime,
    status: { $in: ['PENDING', 'CONFIRMED'] },
  }).session(session).lean();

  const team1Count = slotBookings.filter(b => b.teamSide === 1).reduce((s, b) => s + b.playersCount, 0);
  const team2Count = slotBookings.filter(b => b.teamSide === 2).reduce((s, b) => s + b.playersCount, 0);

  if (team1Count >= 3 && team2Count >= 3) {
    // Auto-confirm all PENDING bookings in this slot
    await Booking.updateMany(
      {
        venue: venueId,
        date: bookingDate,
        startTime,
        endTime,
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
  await Booking.deleteMany({
    status: 'PAYMENT_PENDING',
    createdAt: { $lt: expiryTime }
  }).session(session);
}
