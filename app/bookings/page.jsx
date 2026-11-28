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
import { releaseExpiredPendingBookings } from '@/lib/booking-utils';
import { formatToAMPM, formatBookingDate } from '@/lib/ist';
import BookingsClient from './BookingsClient';

export const dynamic = 'force-dynamic';

export default async function BookingsPage() {
  const session = await auth();
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent('/bookings')}`);
  }

  await dbConnect();

  // A slot that has passed without filling never got its match — cancel it
  // and return the money (Razorpay, not just the DB).
  await releaseExpiredPendingBookings({ user: session.user.id });

  const rawBookings = await Booking.find({ 
    user: session.user.id,
    status: { $ne: 'PAYMENT_PENDING' }
  })
    .populate('venue')
    .sort({ createdAt: -1 })
    .lean();

  const userBookings = rawBookings.map(b => {
    const isPast = hoursUntilSlot(b) <= 0;
    // If a PENDING booking is in the past, it's effectively cancelled/expired
    const displayStatus = (b.status === 'PENDING' && isPast) ? 'CANCELLED' : b.status;

    return {
      id: b._id.toString(),
      venue: b.venue ? b.venue.name : 'Unknown Venue',
      area: b.venue ? `${b.venue.area}, ${b.venue.city}` : 'Unknown Location',
      date: formatBookingDate(b.date),
      time: `${formatToAMPM(b.startTime)} – ${formatToAMPM(b.endTime)}`,
      status: displayStatus,
      amount: `₹${b.totalAmount}`,
      // Cancellation metadata
      cancelledBy: b.cancelledBy || ((b.status === 'PENDING' && isPast) ? 'ADMIN' : null),
      cancellationReason: b.cancellationReason || ((b.status === 'PENDING' && isPast) ? 'Slot passed without enough players' : null),
      refundPercent: b.refundPercent ?? 0,
      refundAmount: b.refundAmount ?? 0,
      refundStatus: b.refundStatus ?? 'NONE',
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
