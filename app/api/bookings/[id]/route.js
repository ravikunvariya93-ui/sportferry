import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';
import { calculateRefund, getPlayerCancellationTier, hoursUntilSlot } from '@/lib/cancellationPolicy';

export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const { status, cancellationReason } = body;

    if (!status) {
      return NextResponse.json({ message: 'Status is required.' }, { status: 400 });
    }

    const booking = await Booking.findById(params.id).populate('venue');
    if (!booking) {
      return NextResponse.json({ message: 'Booking not found.' }, { status: 404 });
    }

    const isCustomer = booking.user?.toString() === session.user.id;
    const isVenueOwner = booking.venue?.owner?.toString() === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    // 1. Handle Approval
    if (status === 'CONFIRMED') {
      if (!isVenueOwner && !isAdmin) {
        return NextResponse.json({ message: 'Not authorized to approve this booking.' }, { status: 403 });
      }
      
      if (booking.status === 'CANCELLED') {
        return NextResponse.json({ message: 'Cannot approve a cancelled booking.' }, { status: 400 });
      }

      booking.status = 'CONFIRMED';
    } 
    // 2. Handle Cancellation (with policy enforcement)
    else if (status === 'CANCELLED') {
      if (!isCustomer && !isVenueOwner && !isAdmin) {
        return NextResponse.json({ message: 'Not authorized to cancel this booking.' }, { status: 403 });
      }

      if (booking.status === 'CANCELLED') {
        return NextResponse.json({ message: 'Booking is already cancelled.' }, { status: 400 });
      }

      // Determine who is cancelling
      let cancelledBy = 'PLAYER';
      if (isVenueOwner && !isCustomer) {
        cancelledBy = 'VENDOR';
      } else if (isAdmin && !isCustomer && !isVenueOwner) {
        cancelledBy = 'ADMIN';
      }

      // Vendor must provide a reason
      if (cancelledBy === 'VENDOR' && !cancellationReason?.trim()) {
        return NextResponse.json({ 
          message: 'Venue owners must provide a reason for cancellation.' 
        }, { status: 400 });
      }

      // Player-initiated: check if slot already started
      if (cancelledBy === 'PLAYER') {
        const hrs = hoursUntilSlot(booking);
        if (hrs <= 0) {
          return NextResponse.json({ 
            message: 'Cannot cancel — the slot has already started or passed.' 
          }, { status: 400 });
        }
      }

      // Calculate refund
      const refund = calculateRefund(booking, cancelledBy);

      booking.status = 'CANCELLED';
      booking.cancelledBy = cancelledBy;
      booking.cancelledAt = new Date();
      booking.cancellationReason = cancellationReason?.trim() || undefined;
      booking.refundPercent = refund.refundPercent;
      booking.refundAmount = refund.refundAmount;
    } 
    else {
      return NextResponse.json({ message: 'Invalid status update.' }, { status: 400 });
    }

    await booking.save();

    return NextResponse.json({ 
      success: true, 
      status: booking.status,
      message: `Booking successfully ${status.toLowerCase()}.`,
      refundPercent: booking.refundPercent ?? null,
      refundAmount: booking.refundAmount ?? null,
      cancelledBy: booking.cancelledBy ?? null,
    });
  } catch (error) {
    console.error('[PATCH /api/bookings/[id]]', error);
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

/**
 * GET /api/bookings/[id] — Fetch cancellation preview info for the player.
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const booking = await Booking.findById(params.id).populate('venue');
    if (!booking) {
      return NextResponse.json({ message: 'Booking not found.' }, { status: 404 });
    }

    const isCustomer = booking.user?.toString() === session.user.id;
    const isVenueOwner = booking.venue?.owner?.toString() === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isCustomer && !isVenueOwner && !isAdmin) {
      return NextResponse.json({ message: 'Not authorized.' }, { status: 403 });
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
    console.error('[GET /api/bookings/[id]]', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
