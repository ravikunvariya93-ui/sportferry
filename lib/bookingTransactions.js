import mongoose from 'mongoose';
import SlotLock from '@/models/SlotLock';

/**
 * Booking transactions.
 *
 * The capacity check and the insert run in a transaction, but a transaction
 * gives snapshot isolation — not predicate locks — so two bookings for the
 * same slot can both pass the check and both commit. Writing the slot's lock
 * document inside the transaction makes both transactions touch the *same*
 * document, so MongoDB aborts one of them (write conflict / duplicate key)
 * and the caller retries against a fresh snapshot.
 */

/**
 * A booking that must be rejected (slot full, past date …) — carried out of
 * the transaction so the route can answer with a clean 4xx.
 */
export class BookingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'BookingError';
    this.status = status;
  }
}

// WriteConflict / DuplicateKey — another transaction touched the same slot.
const TRANSIENT_ERROR_CODES = new Set([112, 11000]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run a booking transaction, retrying when it lost a race for the slot.
 *
 * The body must throw a BookingError for anything the caller should see as a
 * 4xx; anything else aborts the transaction and is rethrown.
 */
export async function runBookingTransaction(fn, attempts = 6) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await fn(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (err) {
      try { await session.abortTransaction(); } catch { /* already aborted */ }
      session.endSession();
      if (!TRANSIENT_ERROR_CODES.has(err?.code)) throw err;
      // Let the booking that won the race commit before we try again.
      if (attempt < attempts - 1) await sleep(20 * (attempt + 1));
    }
  }
  // Still losing after every attempt — the slot is being booked hard right
  // now. Answer with a clean "try again" instead of a 500.
  throw new BookingError('That slot is being booked right now — please try again.', 409);
}

/** Key of the lock document for one slot. */
export function slotLockKey(venueId, date, startTime, endTime) {
  return `${venueId}|${date}|${startTime}|${endTime}`;
}

/**
 * Touch the slot's lock document inside the transaction — this is what makes
 * two concurrent bookings for the same slot collide.
 */
export async function lockSlot(key, session) {
  const query = SlotLock.findOneAndUpdate(
    { key },
    { $set: { touchedAt: new Date() } },
    { upsert: true, new: true }
  );
  if (session) query.session(session);
  await query;
}
