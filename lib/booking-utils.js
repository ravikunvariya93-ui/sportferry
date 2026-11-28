import Booking from '@/models/Booking';
import { CONFIRM_PLAYERS } from './capacity';
import { calculateRefund, hoursUntilSlot } from './cancellationPolicy';
import { executeRefund } from './refunds';

/**
 * Per-turf auto-confirm: a turf confirms once it holds 8 players in total,
 * whatever the split — 8v0, 6v2, 4v4 and 5v3 all confirm; 7v0, 6v1 and 7v0 do not.
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

  // Eight players on the turf make a match — the split between the sides
  // (8 and 0, 6 and 2, 4 and 4, 5 and 3 …) does not matter.
  if (team1Count + team2Count >= CONFIRM_PLAYERS) {
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
 * Cancel PENDING bookings whose slot has already started.
 *
 * A turf that never reached the 8-player confirm bar by its start time can
 * never confirm, so the booking is stale. It becomes CANCELLED exactly like an
 * admin cancellation: 100% refund, with the Razorpay refund actually executed
 * for online payments (offline walk-ins have no money to return).
 *
 * Called on read so every list and count agrees without a scheduler.
 *
 * @param {object} [filter] Extra Booking filter, e.g. `{ user }` or `{ venue: { $in } }`.
 * @param {Date} [now]
 * @returns {Promise<number>} how many bookings were cancelled.
 */
export async function releaseExpiredPendingBookings(filter = {}, now = new Date()) {
  const pending = await Booking.find({ ...filter, status: 'PENDING' }).lean();
  let released = 0;

  for (const booking of pending) {
    if (hoursUntilSlot(booking, now) > 0) continue;

    const refund = calculateRefund(booking, 'ADMIN', now);

    // Claim the booking before moving money so two concurrent reads can never
    // refund the same payment twice.
    const claimed = await Booking.findOneAndUpdate(
      { _id: booking._id, status: 'PENDING' },
      {
        $set: {
          status: 'CANCELLED',
          cancelledBy: 'ADMIN',
          cancelledAt: now,
          cancellationReason: 'Slot passed without enough players (auto-refunded)',
          refundPercent: refund.refundPercent,
          refundAmount: refund.refundAmount,
        },
      },
      { new: true }
    ).lean();
    if (!claimed) continue;

    const refundResult = await executeRefund(claimed, refund.refundAmount);
    const refundUpdate = { refundStatus: refundResult.status };
    if (refundResult.refundId) refundUpdate.refundId = refundResult.refundId;
    await Booking.updateOne({ _id: booking._id }, { $set: refundUpdate });

    if (refundResult.status === 'FAILED') {
      console.error('[releaseExpiredPendingBookings] refund failed', refundResult.error);
    }
    released += 1;
  }

  return released;
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
