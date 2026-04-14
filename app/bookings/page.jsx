import React from 'react';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BookingsClient from './BookingsClient';

export const dynamic = 'force-dynamic';

export default async function BookingsPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  await dbConnect();

  const rawBookings = await Booking.find({ user: session.user.id })
    .populate('venue')
    .sort({ createdAt: -1 })
    .lean();

  const userBookings = rawBookings.map(b => ({
    id: b._id.toString(),
    venue: b.venue ? b.venue.name : 'Unknown Venue',
    area: b.venue ? `${b.venue.area}, ${b.venue.city}` : 'Unknown Location',
    date: new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: `${b.startTime} – ${b.endTime}`,
    status: b.status,
    amount: `₹${b.totalAmount}`,
  }));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>My Bookings</h1>
        <p style={{ color: 'var(--muted)' }}>View and manage your past and upcoming games.</p>
      </header>
      <BookingsClient initialBookings={userBookings} />
    </div>
  );
}
