'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Star, Clock, CheckCircle, Navigation, Zap, Shield, CreditCard, CalendarCheck, AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './VenueDetail.module.css';

export default function VenueDetailClient({ venue }) {
  const { data: session } = useSession();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [busySlots, setBusySlots] = useState([]);
  const [bookingState, setBookingState] = useState('idle'); // idle | loading | success | error
  const [classification, setClassification] = useState('SOLO');
  const [playersCount, setPlayersCount] = useState(1);
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingId, setBookingId] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!selectedSlot) return;
    const updateCountdown = () => {
      const [startTimeStr] = selectedSlot.split(' – ');
      const [time, meridiem] = startTimeStr.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (meridiem === 'PM' && h !== 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;
      
      const slotTime = new Date();
      slotTime.setHours(h, m, 0, 0);
      
      const diff = slotTime - new Date();
      if (diff <= 0) {
        setTimeLeft('Started');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) {
          setTimeLeft(`${hours}h ${mins}m left hurry up`);
        } else {
          setTimeLeft(`${mins}m left hurry up`);
        }
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [selectedSlot]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchAvailability = async (signal) => {
      try {
        const res = await fetch(`/api/venues/${venue._id}/availability?date=${selectedDate}`, { signal });
        if (res.ok) {
          const data = await res.json();
          setBusySlots(data.slotStats || {});
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to fetch availability', err);
      }
    };
    if (selectedDate) fetchAvailability(controller.signal);
    return () => controller.abort();
  }, [selectedDate, venue._id]);

  const slots = [
    '06:00 AM – 09:00 AM',
    '09:00 AM – 12:00 PM',
    '12:00 PM – 03:00 PM',
    '03:00 PM – 06:00 PM',
    '06:00 PM – 11:59 PM',
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
          sport: venue.sportTypes[0],
          classification: classification,
          playersCount: playersCount,
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    {slots.map(slot => {
                      const stats = busySlots[slot] || { team1: 0, team2: 0, total: 0 };
                      const isFull = stats.total >= 12;
                      const isSelected = selectedSlot === slot;
                      
                      const isToday = selectedDate === new Date().toISOString().split('T')[0];
                      let hasPassed = false;
                      if (isToday) {
                        const [startTimeStr] = slot.split(' – ');
                        const [time, meridiem] = startTimeStr.split(' ');
                        let [h, m] = time.split(':').map(Number);
                        if (meridiem === 'PM' && h !== 12) h += 12;
                        if (meridiem === 'AM' && h === 12) h = 0;
                        const slotTime = new Date();
                        slotTime.setHours(h, m, 0, 0);
                        hasPassed = slotTime < new Date();
                      }

                      const isDisabled = isFull || hasPassed;
                      
                      return (
                        <button
                          key={slot}
                          disabled={isDisabled}
                          onClick={() => { setSelectedSlot(slot); setBookingState('idle'); }}
                          style={{
                            padding: '16px',
                            borderRadius: '16px',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                            background: isSelected ? 'rgba(22,163,74,0.1)' : 'var(--secondary)',
                            color: 'var(--foreground)',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            opacity: isDisabled ? 0.6 : 1,
                            transition: 'all 0.2s ease',
                            textAlign: 'left',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700' }}>{slot}</span>
                            {isSelected && <CheckCircle size={16} color="var(--primary)" />}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--muted)' }}>
                            <div style={{ display: 'flex', flexDir: 'column' }}>
                              <span>Team 1: <strong>{stats.team1}/6</strong></span>
                              <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '4px' }}>
                                <div style={{ width: `${(stats.team1 / 6) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: '2px' }} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDir: 'column' }}>
                              <span>Team 2: <strong>{stats.team2}/6</strong></span>
                              <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '4px' }}>
                                <div style={{ width: `${(stats.team2 / 6) * 100}%`, height: '100%', background: '#3b82f6', borderRadius: '2px' }} />
                              </div>
                            </div>
                          </div>

                          {isSelected && !isDisabled && (
                            <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> {timeLeft}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Classification & Players Picker */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Booking Type</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {['SOLO', 'TEAM', 'GROUP'].map(type => {
                          const active = classification === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                setClassification(type);
                                // Set default players count for each type
                                if (type === 'SOLO') setPlayersCount(1);
                                if (type === 'TEAM') setPlayersCount(3);
                                if (type === 'GROUP') setPlayersCount(12);
                              }}
                              style={{
                                flex: 1, padding: '10px 4px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                                background: active ? 'var(--primary)' : 'var(--secondary)',
                                color: active ? 'white' : 'var(--foreground)',
                                border: active ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                                textTransform: 'capitalize', letterSpacing: '0.5px'
                              }}
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Players</label>
                      <select 
                         value={playersCount}
                         onChange={(e) => setPlayersCount(parseInt(e.target.value))}
                         style={{
                           width: '100%', padding: '0 10px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', 
                           background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--glass-border)',
                           outline: 'none', height: '40px', appearance: 'none', cursor: 'pointer'
                         }}
                      >
                        {classification === 'SOLO' && [1, 2].map(n => <option key={n} value={n}>{n} Player{n > 1 ? 's' : ''}</option>)}
                        {classification === 'TEAM' && [3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Players</option>)}
                        {classification === 'GROUP' && <option value={12}>12 Players (Full)</option>}
                      </select>
                    </div>
                  </div>
                  
                  {/* Real-time Side Filling info */}
                  {selectedSlot && busySlots[selectedSlot] && classification === 'SOLO' && (
                    <div style={{ marginTop: '16px', background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '13px', color: '#1d4ed8' }}>
                      <AlertCircle size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                      {busySlots[selectedSlot].soloSide === 2 
                        ? 'Solo Bookings are in progress on Team 2 Side, Please Select on Team - 2 Side'
                        : 'Solo Bookings are in progress on Team 1 Side, Please Select on Team - 1 Side'
                      }
                    </div>
                  )}

                  {selectedSlot && busySlots[selectedSlot] && busySlots[selectedSlot].team1 === 5 && playersCount === 4 && (
                    <div style={{ marginTop: '16px', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '13px', color: '#b91c1c' }}>
                      <AlertCircle size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                      Choose another turf because there is more players are playing against this turf
                    </div>
                  )}

                  {/* ──────────────── New: Team Rosters ──────────────── */}
                  {selectedSlot && busySlots[selectedSlot] && (busySlots[selectedSlot].team1Slots?.length > 0 || busySlots[selectedSlot].team2Slots?.length > 0) && (
                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <div style={{ padding: '6px', background: 'rgba(22,163,74,0.1)', borderRadius: '8px' }}>
                          <Star size={14} color="var(--primary)" />
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: '700' }}>Current Match Lineup</h4>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {/* Team 1 Side */}
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Team 1 <span style={{ padding: '2px 6px', background: 'rgba(22,163,74,0.1)', borderRadius: '4px', fontSize: '9px' }}>{busySlots[selectedSlot].team1}/6</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {busySlots[selectedSlot].team1Slots?.map((p, idx) => (
                              <div key={idx} style={{ padding: '8px 10px', background: 'var(--secondary)', borderRadius: '10px', border: '1px solid var(--glass-border)', fontSize: '12px' }}>
                                <div style={{ fontWeight: '600', color: 'var(--foreground)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{p.type.toLowerCase()}</span>
                                  <span>x{p.count}</span>
                                </div>
                              </div>
                            ))}
                            {busySlots[selectedSlot].team1 < 6 && (
                              <div style={{ padding: '8px', border: '1px dashed var(--glass-border)', borderRadius: '10px', textAlign: 'center', fontSize: '10px', color: 'var(--muted)' }}>
                                {6 - busySlots[selectedSlot].team1} spots left
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Team 2 Side */}
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Team 2 <span style={{ padding: '2px 6px', background: 'rgba(59,130,246,0.1)', borderRadius: '4px', fontSize: '9px' }}>{busySlots[selectedSlot].team2}/6</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {busySlots[selectedSlot].team2Slots?.map((p, idx) => (
                              <div key={idx} style={{ padding: '8px 10px', background: 'var(--secondary)', borderRadius: '10px', border: '1px solid var(--glass-border)', fontSize: '12px' }}>
                                <div style={{ fontWeight: '600', color: 'var(--foreground)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{p.type.toLowerCase()}</span>
                                  <span>x{p.count}</span>
                                </div>
                              </div>
                            ))}
                            {busySlots[selectedSlot].team2 < 6 && (
                              <div style={{ padding: '8px', border: '1px dashed var(--glass-border)', borderRadius: '10px', textAlign: 'center', fontSize: '10px', color: 'var(--muted)' }}>
                                {6 - busySlots[selectedSlot].team2} spots left
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
