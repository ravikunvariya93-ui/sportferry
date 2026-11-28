import { NextResponse } from 'next/server';
import { apiError, unauthorized, badRequest, notFound, forbidden, conflict } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { auth, hasRole } from '@/lib/auth';
import { calculateRefund, getPlayerCancellationTier, hoursUntilSlot } from '@/lib/cancellationPolicy';
import { executeRefund } from '@/lib/refunds';
import { autoConfirmIfReady } from '@/lib/booking-utils';
import { claimCancelled } from '@/lib/bookingClaims';

export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session) {
      return unauthorized('Unauthorized');
    }

    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const { status, cancellationReason } = body;

    if (!status) {
      return badRequest('Status is required.');
    }

    const booking = await Booking.findById(params.id).populate('venue');
    if (!booking) {
      return notFound('Booking not found.');
    }

    const isCustomer = booking.user?.toString() === session.user.id;
    const isVenueOwner = booking.venue?.owner?.toString() === session.user.id;
    const isAdmin = await hasRole(session, 'ADMIN');

    // 1. Handle Approval
    if (status === 'CONFIRMED') {
      if (!isVenueOwner && !isAdmin) {
        return forbidden('Not authorized to approve this booking.');
      }
      
      if (booking.status === 'CANCELLED') {
        return badRequest('Cannot approve a cancelled booking.');
      }
      if (booking.status === 'PAYMENT_PENDING') {
        return badRequest('Payment is still being processed — this hold can only be confirmed by payment.');
      }

      booking.status = 'CONFIRMED';
    } 
    // 2. Handle Cancellation (with policy enforcement)
    else if (status === 'CANCELLED') {
      if (!isCustomer && !isVenueOwner && !isAdmin) {
        return forbidden('Not authorized to cancel this booking.');
      }

      if (booking.status === 'CANCELLED') {
        return badRequest('Booking is already cancelled.');
      }

      // A checkout may still be in flight. Cancelling here would leave a
      // captured payment with no live hold to refund (the webhook cannot know
      // who to pay back). Unpaid holds disappear after 15 minutes on their own.
      if (booking.status === 'PAYMENT_PENDING') {
        return badRequest('Payment is still being processed. If you do not pay, the slot is released automatically.');
      }

      // Determine who is cancelling
      let cancelledBy = 'PLAYER';
      if (isVenueOwner && !isCustomer) {
        cancelledBy = 'VENDOR';
      } else if (isAdmin && !isCustomer && !isVenueOwner) {
        cancelledBy = 'ADMIN';
      }

      // ── VENDOR CANNOT CANCEL BOOKINGS ─────────────────────────────────
      if (cancelledBy === 'VENDOR') {
        return forbidden('Vendors cannot cancel bookings. Please contact admin if needed.');
      }

      // Player-initiated: check if slot already started
      if (cancelledBy === 'PLAYER') {
        const hrs = hoursUntilSlot(booking);
        if (hrs <= 0) {
          return badRequest('Cannot cancel — the slot has already started or passed.');
        }
      }

      // Claim the booking atomically before asking Razorpay for a refund, so
      // two concurrent cancellations can never pay out twice.
      const claimed = await claimCancelled(booking._id);
      if (!claimed) {
        return conflict('Booking is already cancelled.');
      }

      // Calculate refund
      const refund = calculateRefund(booking, cancelledBy);

      booking.status = 'CANCELLED';
      booking.cancelledBy = cancelledBy;
      booking.cancelledAt = new Date();
      booking.cancellationReason = cancellationReason?.trim() || undefined;
      booking.refundPercent = refund.refundPercent;
      booking.refundAmount = refund.refundAmount;

      // The refund is not a note in the DB — ask Razorpay to actually return
      // the money. If it fails the slot still frees up, but the status records
      // that the money is still owed.
      const refundResult = await executeRefund(booking, refund.refundAmount);
      booking.refundStatus = refundResult.status;
      booking.refundId = refundResult.refundId;
      if (refundResult.status === 'FAILED') {
        console.error('[PATCH /api/bookings/[id]] refund failed', refundResult.error);
      }
    } 
    else {
      return badRequest('Invalid status update.');
    }

    await booking.save();

    // A vendor approval is one of the ways a turf fills up — re-check the whole
    // turf so the other bookings on it confirm as well.
    if (booking.status === 'CONFIRMED') {
      const venueId = booking.venue?._id || booking.venue;
      await autoConfirmIfReady(venueId, booking.date, booking.startTime, booking.endTime, booking.turf);
    }

    return NextResponse.json({
      success: true,
      status: booking.status,
      message: `Booking successfully ${status.toLowerCase()}.`,
      refundPercent: booking.refundPercent ?? null,
      refundAmount: booking.refundAmount ?? null,
      refundStatus: booking.refundStatus ?? 'NONE',
      cancelledBy: booking.cancelledBy ?? null,
    });
  } catch (error) {
    return apiError(error, 'PATCH /api/bookings/[id]', { message: 'Something went wrong. Please try again.' });
  }
}

/**
 * GET /api/bookings/[id] — Fetch cancellation preview info for the player.
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session) {
      return unauthorized('Unauthorized');
    }

    await dbConnect();

    const booking = await Booking.findById(params.id).populate('venue');
    if (!booking) {
      return notFound('Booking not found.');
    }

    const isCustomer = booking.user?.toString() === session.user.id;
    const isVenueOwner = booking.venue?.owner?.toString() === session.user.id;
    const isAdmin = await hasRole(session, 'ADMIN');

    if (!isCustomer && !isVenueOwner && !isAdmin) {
      return forbidden('Not authorized.');
    }

    // If already cancelled, return the existing data
    if (booking.status === 'CANCELLED') {
      return NextResponse.json({
        status: 'CANCELLED',
        cancelledBy: booking.cancelledBy,
        cancelledAt: booking.cancelledAt,
        cancellationReason: booking.cancellationReason,
        refundPercent: booking.refundPercent,
        refundAmount: booking.refundAmount,
      });
    }

    // Preview what would happen if the player cancelled right now
    const tier = getPlayerCancellationTier(booking);
    const refund = calculateRefund(booking, 'PLAYER');

    return NextResponse.json({
      status: booking.status,
      cancellationPreview: {
        hoursLeft: tier.hoursLeft,
        blocked: tier.blocked,
        refundPercent: refund.refundPercent,
        refundAmount: refund.refundAmount,
        label: refund.label,
        tag: refund.tag,
      },
    });
  } catch (error) {
    return apiError(error, 'GET /api/bookings/[id]', { message: 'Something went wrong.' });
  }
}
