'use client';

import React from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';

export default function BookingsPage() {
  const dummyBookings = [
    {
      id: 1,
      venue: 'Green Field Box Cricket',
      area: 'Andheri, Mumbai',
      date: '12th April 2026',
      time: '06:00 PM - 07:00 PM',
      status: 'CONFIRMED',
      amount: '₹1200'
    },
    {
      id: 2,
      venue: 'Strikers Football Turf',
      area: 'Indiranagar, Bangalore',
      date: '5th April 2026',
      time: '08:00 AM - 09:00 AM',
      status: 'COMPLETED',
      amount: '₹1500'
    }
  ];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>My Bookings</h1>
        <p style={{ color: 'var(--muted)' }}>View your past and upcoming games.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {dummyBookings.map((booking) => (
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
        ))}
      </div>
    </div>
  );
}
