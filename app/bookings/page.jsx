import React from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
// Import Venue so mongoose knows the schema to populate against
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

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
    time: `${b.startTime} - ${b.endTime}`,
    status: b.status,
    amount: `₹${b.totalAmount}`
  }));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>My Bookings</h1>
        <p style={{ color: 'var(--muted)' }}>View your past and upcoming games.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {userBookings.length > 0 ? userBookings.map((booking) => (
          <div key={booking.id} className="glass-morphism" style={{ 
            padding: '24px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderLeft: booking.status === 'CONFIRMED' ? '4px solid var(--primary)' : '4px solid var(--muted)'
          }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{booking.venue}</h3>
              <div style={{ display: 'flex', gap: '16px', color: 'var(--muted)', fontSize: '14px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} /> {booking.area}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} /> {booking.date}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} /> {booking.time}
                </div>
              </div>
              <span style={{ 
                fontSize: '12px', 
                background: booking.status === 'CONFIRMED' ? 'rgba(22, 163, 74, 0.1)' : 'var(--glass-border)', 
                color: booking.status === 'CONFIRMED' ? 'var(--primary)' : 'var(--muted)',
                padding: '4px 8px', 
                borderRadius: '4px',
                fontWeight: '600'
              }}>
                {booking.status}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--foreground)' }}>{booking.amount}</div>
              {booking.status === 'CONFIRMED' && (
                <button className="btn-primary" style={{ marginTop: '12px', fontSize: '14px', padding: '6px 12px' }}>Get Directions</button>
              )}
            </div>
          </div>
        )) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
            You haven't made any bookings yet! Discover local sports venues today.
          </div>
        )}
      </div>
    </div>
  );
}
