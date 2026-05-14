import React from 'react';

export const metadata = {
  title: 'My Bookings | Sportferry',
  description: 'Manage your sports venue bookings and track your upcoming games.',
};
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hoursUntilSlot } from '@/lib/cancellationPolicy';
import { formatToAMPM } from '@/lib/booking-utils';
import BookingsClient from './BookingsClient';

export const dynamic = 'force-dynamic';

export default async function BookingsPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  await dbConnect();

  const rawBookings = await Booking.find({ 
    user: session.user.id,
    status: { $ne: 'PAYMENT_PENDING' }
  })
    .populate('venue')
    .sort({ createdAt: -1 })
    .lean();

  // Proactive Auto-Refund: If any PENDING booking has passed, mark it as CANCELLED with 100% refund
  const now = new Date();
  for (const b of rawBookings) {
    if (b.status === 'PENDING') {
      const isPast = hoursUntilSlot(b) <= 0;
      if (isPast) {
        // Update in DB (fire and forget for this request, or wait)
        await Booking.findByIdAndUpdate(b._id, {
          status: 'CANCELLED',
          cancelledBy: 'ADMIN',
          cancellationReason: 'Slot passed without enough players (Auto-Refunded)',
          refundPercent: 100,
          refundAmount: b.totalAmount
        });
        // Update the local object for immediate UI feedback
        b.status = 'CANCELLED';
        b.cancelledBy = 'ADMIN';
        b.cancellationReason = 'Slot passed without enough players (Auto-Refunded)';
        b.refundPercent = 100;
        b.refundAmount = b.totalAmount;
      }
    }
  }

  const userBookings = rawBookings.map(b => {
    const isPast = hoursUntilSlot(b) <= 0;
    // If a PENDING booking is in the past, it's effectively cancelled/expired
    const displayStatus = (b.status === 'PENDING' && isPast) ? 'CANCELLED' : b.status;

    return {
      id: b._id.toString(),
      venue: b.venue ? b.venue.name : 'Unknown Venue',
      area: b.venue ? `${b.venue.area}, ${b.venue.city}` : 'Unknown Location',
      date: new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: `${formatToAMPM(b.startTime)} – ${formatToAMPM(b.endTime)}`,
      status: displayStatus,
      amount: `₹${b.totalAmount}`,
      // Cancellation metadata
      cancelledBy: b.cancelledBy || ((b.status === 'PENDING' && isPast) ? 'ADMIN' : null),
      cancellationReason: b.cancellationReason || ((b.status === 'PENDING' && isPast) ? 'Slot passed without enough players' : null),
      refundPercent: b.refundPercent ?? 0,
      refundAmount: b.refundAmount ?? 0,
      isPast,
    };
  });

  return (
    <div className="responsive-gap-sm" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>My Bookings</h1>
        <p style={{ color: 'var(--muted)' }}>View and manage your past and upcoming games.</p>
      </header>
      <BookingsClient initialBookings={userBookings} />
    </div>
  );
}
