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

  if ((team1Count + team2Count) >= 6) {
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
  const query = Booking.deleteMany({
    status: 'PAYMENT_PENDING',
    createdAt: { $lt: expiryTime }
  });
  if (session) query.session(session);
  await query;
}

/**
 * Returns a robust UTC range that corresponds to the IST (Indian Standard Time)
 * midnight-to-midnight for a given YYYY-MM-DD date string.
 * This guarantees consistent date queries regardless of server timezone.
 */
export function getISTDayRange(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  
  // IST is UTC + 5:30.
  // Midnight IST on that day is 18:30 UTC of the PREVIOUS day.
  const startUTC = new Date(Date.UTC(year, month - 1, day - 1, 18, 30, 0, 0));
  
  // End of IST day is 18:29:59.999 UTC on the CURRENT day.
  const endUTC = new Date(Date.UTC(year, month - 1, day, 18, 29, 59, 999));
  
  return { startUTC, endUTC };
}

/**
 * Convert 24h time "HH:mm" to 12h format "hh:mm AM/PM"
 */
export function formatToAMPM(timeStr) {
  if (!timeStr) return '';
  let [h, m] = timeStr.split(':').map(Number);
  const meridiem = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${meridiem}`;
}
