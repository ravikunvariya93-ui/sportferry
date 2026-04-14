'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Star, Clock, CheckCircle, Navigation, Zap, Shield, CreditCard, CalendarCheck, AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './VenueDetail.module.css';

export default function VenueDetailClient({ venue }) {
  const { data: session } = useSession();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [busySlots, setBusySlots] = useState([]);
  const [bookingState, setBookingState] = useState('idle'); // idle | loading | success | error
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await fetch(`/api/venues/${venue._id}/availability?date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          setBusySlots(data.busySlots || []);
        }
      } catch (err) {
        console.error('Failed to fetch availability', err);
      }
    };
    if (selectedDate) fetchAvailability();
  }, [selectedDate, venue._id]);

  const slots = [
    '06:00 AM – 07:00 AM',
    '07:00 AM – 08:00 AM',
    '08:00 AM – 09:00 AM',
    '09:00 AM – 10:00 AM',
    '04:00 PM – 05:00 PM',
    '05:00 PM – 06:00 PM',
    '06:00 PM – 07:00 PM',
    '07:00 PM – 08:00 PM',
    '08:00 PM – 09:00 PM',
    '09:00 PM – 10:00 PM',
    '10:00 PM – 11:00 PM',
    '11:00 PM – 12:00 AM',
  ];

  const mapQuery = encodeURIComponent(`${venue.area}, ${venue.city}, Sports`);

  const handleBook = async () => {
    if (!session) {
      router.push('/login');
      return;
    }
    if (!selectedSlot) {
      setBookingState('error');
      setBookingMessage('Please select a time slot before booking.');
      return;
    }
    if (!selectedDate) {
      setBookingState('error');
      setBookingMessage('Please select a date before booking.');
      return;
    }

    setBookingState('loading');
    setBookingMessage('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: venue._id,
          date: selectedDate,
          slot: selectedSlot,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setBookingId(data.bookingId);
        setBookingState('success');
      } else {
        setBookingState('error');
        setBookingMessage(data.message || 'Booking failed. Please try again.');
      }
    } catch {
      setBookingState('error');
      setBookingMessage('Network error. Please check your connection.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '80px' }}>

      {/* Cinematic Hero */}
      <section className={styles.hero}>
        <img
          src={venue.images[0] || 'https://images.unsplash.com/photo-1529900948632-586bc48be71a?auto=format&fit=crop&q=80&w=1600'}
          alt={venue.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%)'
        }} />
        <div className={styles.heroContent}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {venue.sportTypes.map(s => (
              <span key={s} style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 'bold' }}>
                {s}
              </span>
            ))}
          </div>
          <h1 className={styles.heroTitle}>{venue.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '15px', color: 'rgba(255,255,255,0.9)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={18} color="var(--primary)" /> {venue.area}, {venue.city}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={18} color="#fbbf24" fill="#fbbf24" />
              <span style={{ fontWeight: '600', color: 'white' }}>{venue.rating || 4.5}</span> (120 reviews)
            </div>
          </div>
        </div>
      </section>

      {/* Main 2-Column Layout */}
      <div className={styles.mainGrid}>

        {/* Left: Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>

          {/* Overview */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', borderBottom: '2px solid var(--glass-border)', paddingBottom: '12px' }}>Overview</h2>
            <p style={{ color: 'var(--muted)', lineHeight: '1.8', fontSize: '16px' }}>
              Welcome to {venue.name}, located in the heart of {venue.area}. Experience the best {venue.sportTypes[0]} games on our professionally maintained surfaces. Designed for players of all skill levels, we provide top-tier floodlights for night matches, ample parking, and an energetic atmosphere. Whether for casual friendly matches, high-stakes corporate events, or structured tournaments, {venue.name} is the premier sports destination in {venue.city}.
            </p>
            <div style={{ background: 'var(--glass-bg)', padding: '24px', borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '140px' }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} color="var(--primary)" /> Hours of Operation
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Everyday: 6:00 AM – 11:59 PM</div>
              </div>
              <div style={{ width: '1px', background: 'var(--glass-border)' }}></div>
              <div style={{ flex: 1, minWidth: '140px' }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} color="var(--primary)" /> Safety Rules
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Non-marking shoes only.</div>
              </div>
            </div>
          </section>

          {/* Amenities */}
          <section>
            <h2 style={{ fontSize: '22px', fontWeight: '700', borderBottom: '2px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '24px' }}>Amenities</h2>
            <div className={styles.amenitiesGrid}>
              {(venue.amenities && venue.amenities.length > 0
                ? venue.amenities
                : ['Parking', 'Drinking Water', 'Restrooms', 'Floodlights', 'Seating Area', 'Equipments Provided']
              ).map(a => (
                <div key={a} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--secondary)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(22, 163, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={20} color="var(--primary)" />
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>{a}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Location */}
          <section>
            <h2 style={{ fontSize: '22px', fontWeight: '700', borderBottom: '2px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '16px' }}>Location</h2>
            <div style={{ color: 'var(--muted)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Navigation size={18} /> {venue.address}, {venue.city}
            </div>
            <div style={{ height: '350px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'var(--secondary)' }}>
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight="0"
                marginWidth="0"
                src={`https://maps.google.com/maps?width=100%25&height=600&hl=en&q=${mapQuery}&t=&z=14&ie=UTF8&iwloc=B&output=embed`}
              ></iframe>
            </div>
          </section>

        </div>

        {/* Right: Booking Sidebar */}
        <aside>
          <div className="glass-morphism" style={{
            padding: '32px',
            position: 'sticky',
            top: '40px',
            borderRadius: '24px',
            border: '2px solid var(--glass-border)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.06)'
          }}>

            {bookingState === 'success' ? (
              /* ── Success State ── */
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CalendarCheck size={32} color="var(--primary)" />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Booking Confirmed!</h3>
                <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '4px' }}>{venue.name}</p>
                <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '4px' }}>
                  {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>{selectedSlot}</p>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '20px' }}>Ref: {bookingId}</p>
                <button
                  onClick={() => router.push('/bookings')}
                  className="btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: '600', borderRadius: '12px' }}
                >
                  View My Bookings
                </button>
              </div>
            ) : (
              /* ── Booking Form ── */
              <>
                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '32px', fontWeight: '800' }}>₹{venue.pricePerHour}</span>
                  <span style={{ fontSize: '16px', color: 'var(--muted)' }}>/ hour</span>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => { setSelectedDate(e.target.value); setBookingState('idle'); }}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: 'var(--secondary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      color: 'var(--foreground)',
                      fontSize: '15px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Available Time Slots</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {slots.map(slot => {
                      const isBusy = busySlots.includes(slot);
                      const isSelected = selectedSlot === slot;
                      
                      return (
                        <button
                          key={slot}
                          disabled={isBusy}
                          onClick={() => { setSelectedSlot(slot); setBookingState('idle'); }}
                          style={{
                            padding: '10px 8px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                            background: isSelected ? 'var(--primary)' : (isBusy ? 'var(--glass-bg)' : 'var(--secondary)'),
                            color: isSelected ? 'white' : (isBusy ? 'var(--muted)' : 'var(--foreground)'),
                            fontSize: '12px',
                            fontWeight: isSelected ? '600' : '500',
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                            opacity: isBusy ? 0.5 : 1,
                            transition: 'all 0.15s ease',
                            fontFamily: 'inherit',
                            position: 'relative',
                            textDecoration: isBusy ? 'line-through' : 'none'
                          }}
                        >
                          {slot}
                          {isBusy && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--muted)', width: '8px', height: '8px', borderRadius: '50%' }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Inline error banner */}
                {bookingState === 'error' && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '13px'
                  }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                    {bookingMessage}
                  </div>
                )}

                <button
                  onClick={handleBook}
                  disabled={bookingState === 'loading'}
                  className="btn-primary"
                  style={{
                    width: '100%', padding: '18px', fontSize: '16px', fontWeight: '600',
                    borderRadius: '12px', display: 'flex', justifyContent: 'center',
                    alignItems: 'center', gap: '8px',
                    opacity: bookingState === 'loading' ? 0.7 : 1,
                    cursor: bookingState === 'loading' ? 'not-allowed' : 'pointer',
                  }}
                >
                  {bookingState === 'loading' ? (
                    <>
                      <span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      Confirming...
                    </>
                  ) : (
                    <><Zap size={20} /> {session ? 'Checkout & Book' : 'Sign In to Book'}</>
                  )}
                </button>

                <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--muted)', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <CreditCard size={14} /> You won't be charged yet
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
