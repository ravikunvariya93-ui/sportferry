'use client';

import React, { useState } from 'react';
import { MOCK_VENUES } from '@/lib/mockData';
import { MapPin, Star, Clock, CheckCircle, Info } from 'lucide-react';

export default function VenueDetailPage({ params }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // In a real app, we'd fetch the venue by ID
  const venue = MOCK_VENUES[0]; 

  const slots = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px' }}>{venue.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={16} /> {venue.area}, {venue.city}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={16} color="#fbbf24" fill="#fbbf24" /> {venue.rating} (120 reviews)
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)' }}>₹{venue.pricePerHour}</div>
            <div style={{ fontSize: '14px', color: 'var(--muted)' }}>per hour</div>
          </div>
        </div>

        {/* Image Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', height: '400px' }}>
          <img src={venue.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <img src={venue.images[0]} style={{ width: '100%', height: 'calc(50% - 8px)', objectFit: 'cover', borderRadius: '16px', opacity: 0.8 }} />
            <div style={{ position: 'relative', height: 'calc(50% - 8px)' }}>
              <img src={venue.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px', opacity: 0.8 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>
                +12 Photos
              </div>
            </div>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Description */}
          <section>
            <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '16px' }}>About this venue</h2>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              Experience the best box cricket experience in {venue.city}. Our turf is professionally maintained with high-quality artificial grass, floodlights for night matches, and ample parking space. Perfect for friendly matches, corporate events, and tournaments.
            </p>
          </section>

          {/* Amenities */}
          <section>
            <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '16px' }}>Amenities</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {['Parking', 'Drinking Water', 'Changing Room', 'Restrooms', 'Floodlights', 'Seating Area'].map(a => (
                <div key={a} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)' }}>
                  <CheckCircle size={18} color="var(--primary)" /> {a}
                </div>
              ))}
            </div>
          </section>

          {/* Location */}
          <section>
            <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '16px' }}>Location</h2>
            <div className="glass-morphism" style={{ height: '240px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
              Interactive Map Placeholder
            </div>
          </section>
        </div>

        {/* Booking Sidebar */}
        <aside>
          <div className="glass-morphism" style={{ padding: '24px', position: 'sticky', top: '40px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>Book a Slot</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--muted)' }}>Select Date</label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: 'var(--secondary)', 
                  border: '1px solid var(--glass-border)', 
                  borderRadius: '8px', 
                  color: 'var(--foreground)' 
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '12px', color: 'var(--muted)' }}>Available Slots</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {slots.map(slot => (
                  <button 
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    style={{ 
                      padding: '8px', 
                      borderRadius: '6px', 
                      border: '1px solid var(--glass-border)',
                      background: selectedSlot === slot ? 'var(--primary)' : 'var(--secondary)',
                      color: selectedSlot === slot ? 'white' : 'var(--muted)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {selectedSlot && (
              <div style={{ padding: '16px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--primary)' }}>
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>Booking Summary</div>
                <div style={{ fontWeight: '600' }}>{selectedSlot} | {selectedDate}</div>
              </div>
            )}

            <button className="btn-primary" style={{ width: '100%', padding: '14px' }}>
              Proceed to Pay ₹{venue.pricePerHour}
            </button>
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', marginTop: '12px' }}>
              No cancellation fees up to 24 hours before the match.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
