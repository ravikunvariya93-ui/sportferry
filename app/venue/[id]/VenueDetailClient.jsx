'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Star, Clock, CheckCircle, Navigation, Zap, Shield, CreditCard, CalendarCheck, AlertCircle, Info, ChevronDown } from 'lucide-react';
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
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [busySlots, setBusySlots] = useState([]);
  const [bookingState, setBookingState] = useState('idle'); // idle | loading | success | error
  const [classification, setClassification] = useState('SOLO');
  const [playersCount, setPlayersCount] = useState(1);
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingId, setBookingId] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (selectedSlots.length === 0) return;
    const updateCountdown = () => {
      const [startTimeStr] = selectedSlots[0].split(' – ');
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
        setTimeLeft(hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [selectedSlots]);

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
    '06:00 AM – 07:00 AM',
    '07:00 AM – 08:00 AM',
    '08:00 AM – 09:00 AM',
    '09:00 AM – 10:00 AM',
    '10:00 AM – 11:00 AM',
    '11:00 AM – 12:00 PM',
    '12:00 PM – 01:00 PM',
    '01:00 PM – 02:00 PM',
    '02:00 PM – 03:00 PM',
    '03:00 PM – 04:00 PM',
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

  const toggleSlot = (slot) => {
    setSelectedSlots(prev => {
      if (prev.includes(slot)) return prev.filter(s => s !== slot);
      return [...prev, slot];
    });
    setBookingState('idle');
  };

  const handleBook = async () => {
    if (!session) { router.push('/login'); return; }
    if (selectedSlots.length === 0) {
      setBookingState('error');
      setBookingMessage('Please select at least one time slot.');
      return;
    }
    if (!selectedDate) {
      setBookingState('error');
      setBookingMessage('Please select a date.');
      return;
    }
    
    setBookingState('loading');
    setBookingMessage('');

    try {
      // 1. Create Razorpay Order
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: venue._id,
          date: selectedDate,
          slots: selectedSlots,
          sport: venue.sportTypes[0],
          classification,
          playersCount,
        }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        setBookingState('error');
        setBookingMessage(orderData.message || 'Failed to initiate payment.');
        return;
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SportFerry",
        description: `Booking for ${venue.name}`,
        order_id: orderData.orderId,
        handler: async function (response) {
          // 3. Verify Payment
          setBookingState('loading');
          setBookingMessage('Verifying payment...');
          
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok) {
              setBookingId(verifyData.bookingIds[0]);
              setBookingState('success');
            } else {
              setBookingState('error');
              setBookingMessage(verifyData.message || 'Payment verification failed.');
            }
          } catch (err) {
            setBookingState('error');
            setBookingMessage('Verification failed. Please contact support.');
          }
        },
        prefill: {
          name: orderData.customerName,
          email: orderData.customerEmail,
          contact: orderData.customerPhone,
        },
        theme: { color: "#16a34a" },
        modal: {
          ondismiss: function() {
            setBookingState('idle');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment flow error:', error);
      setBookingState('error');
      setBookingMessage('An error occurred. Please try again.');
    }
  };

  return (
    <div className="responsive-gap-sm" style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '80px' }}>

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
        <div className="responsive-gap-sm" style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>

          {/* Overview */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', borderBottom: '2px solid var(--glass-border)', paddingBottom: '12px' }}>Overview</h2>
            <p style={{ color: 'var(--muted)', lineHeight: '1.8', fontSize: '16px' }}>
              Welcome to {venue.name}, located in the heart of {venue.area}. Experience the best {venue.sportTypes[0]} games on our professionally maintained surfaces. Designed for players of all skill levels, we provide top-tier floodlights for night matches, ample parking, and an energetic atmosphere. Whether for casual friendly matches, high-stakes corporate events, or structured tournaments, {venue.name} is the premier sports destination in {venue.city}.
            </p>
            <div className="responsive-flex-col responsive-padding responsive-gap-sm" style={{ background: 'var(--glass-bg)', padding: '24px', borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'flex', gap: '24px' }}>
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
          <div className="glass-morphism responsive-padding" style={{
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
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Booking Received!</h3>
                <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '12px' }}>Your booking will be confirmed once each team has at least 3 players.</p>
                <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '4px' }}>{venue.name}</p>
                <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '4px' }}>
                  {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>{selectedSlots.join(', ')}</p>
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

                {/* Classification & Players Picker */}
                <div style={{ marginBottom: '24px' }}>
                  <div className="responsive-grid-1 responsive-gap-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Select Time Slots <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: '400' }}>(multiple allowed)</span></label>
                  
                  {/* Multi-select dropdown */}
                  {/* Custom Slot Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '6px' }}>
                    {slots.map(slot => {
                      const stats = busySlots[slot] || { team1: 0, team2: 0, total: 0 };
                      const isFull = stats.total >= 12;
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
                      const isSelected = selectedSlots.includes(slot);

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => toggleSlot(slot)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '12px',
                            borderRadius: '12px',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                            background: isSelected ? 'var(--primary)' : 'var(--secondary)',
                            color: isSelected ? 'white' : (isDisabled ? 'var(--muted)' : 'var(--foreground)'),
                            opacity: isDisabled ? 0.5 : 1,
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: isSelected ? 'scale(0.98)' : 'scale(1)',
                            boxShadow: isSelected ? '0 4px 12px rgba(22, 163, 74, 0.3)' : 'none',
                          }}
                        >
                          <span style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>{slot}</span>
                          <span style={{ fontSize: '11px', fontWeight: '600', opacity: 0.9 }}>
                            {isFull ? 'FULL' : hasPassed ? 'PASSED' : `${stats.total}/12 Players`}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected slots summary */}
                  {selectedSlots.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedSlots.map(s => (
                        <span key={s} style={{
                          padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '600',
                          background: 'rgba(22,163,74,0.15)', color: 'var(--primary)', border: '1px solid rgba(22,163,74,0.3)',
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                          <Clock size={12} /> {s}
                          <button onClick={() => setSelectedSlots(prev => prev.filter(x => x !== s))} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', padding: 0, lineHeight: 1 }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Turf visualization for first selected slot */}
                  {selectedSlots.length > 0 && (() => {
                    const slot = selectedSlots[0];
                    const stats = busySlots[slot] || { team1: 0, team2: 0, total: 0 };
                    const isSelected = true;
                    let projTeam1 = 0, projTeam2 = 0, validPlacement = true;

                    if (classification === 'GROUP') { projTeam1 = 6; projTeam2 = 6; }
                    else if (classification === 'SOLO') {
                      const hasSoloSide1 = stats.soloSide === 1;
                      const hasSoloSide2 = stats.soloSide === 2;
                      let assignedSide = 1;
                      if (hasSoloSide2 && stats.team2 < 6) assignedSide = 2;
                      else if (hasSoloSide1 && stats.team1 < 6) assignedSide = 1;
                      else if (stats.team2 > 0 && stats.team2 < 6 && !hasSoloSide1) assignedSide = 1;
                      else if (stats.team1 < 6) assignedSide = 1;
                      else if (stats.team2 < 6) assignedSide = 2;
                      if (assignedSide === 1) projTeam1 = playersCount; else projTeam2 = playersCount;
                      if (stats.team1 + projTeam1 > 6 && assignedSide === 1) validPlacement = false;
                      if (stats.team2 + projTeam2 > 6 && assignedSide === 2) validPlacement = false;
                    } else if (classification === 'TEAM') {
                      if (stats.team1 === 5 && playersCount === 4) validPlacement = false;
                      else if (stats.team1 + playersCount <= 6) projTeam1 = playersCount;
                      else if (stats.team2 + playersCount <= 6) projTeam2 = playersCount;
                      else validPlacement = false;
                    }

                    return (
                      <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(0,164,180,0.06)', borderRadius: '12px', border: '1px dashed #00a4b4' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700' }}>Turf 1 — {slot}</span>
                          {timeLeft && <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {timeLeft}</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', width: '50px' }}>Team 1</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {[...Array(6)].map((_, i) => (
                                <div key={`t1-${i}`} style={{
                                  width: '14px', height: '14px', borderRadius: '50%',
                                  background: i < stats.team1 ? '#00a4b4' : (validPlacement && i < stats.team1 + projTeam1 ? '#fbbf24' : '#1a1a1a'),
                                  boxShadow: i < stats.team1 ? '0 0 6px rgba(0,164,180,0.4)' : (validPlacement && i < stats.team1 + projTeam1 ? '0 0 8px rgba(251,191,36,0.6)' : 'none'),
                                  flexShrink: 0, transition: 'all 0.3s ease'
                                }} />
                              ))}
                            </div>
                          </div>
                          <div style={{ height: '1px', borderBottom: '1px dashed #00a4b4', opacity: 0.4 }}></div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', width: '50px' }}>Team 2</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {[...Array(6)].map((_, i) => (
                                <div key={`t2-${i}`} style={{
                                  width: '14px', height: '14px', borderRadius: '50%',
                                  background: i < stats.team2 ? '#00a4b4' : (validPlacement && i < stats.team2 + projTeam2 ? '#fbbf24' : '#1a1a1a'),
                                  boxShadow: i < stats.team2 ? '0 0 6px rgba(0,164,180,0.4)' : (validPlacement && i < stats.team2 + projTeam2 ? '0 0 8px rgba(251,191,36,0.6)' : 'none'),
                                  flexShrink: 0, transition: 'all 0.3s ease'
                                }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>


                  {/* ──────────────── New: Team Rosters ──────────────── */}
                  {selectedSlots.length > 0 && busySlots[selectedSlots[0]] && (busySlots[selectedSlots[0]].team1Slots?.length > 0 || busySlots[selectedSlots[0]].team2Slots?.length > 0) && (
                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <div style={{ padding: '6px', background: 'rgba(22,163,74,0.1)', borderRadius: '8px' }}>
                          <Star size={14} color="var(--primary)" />
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: '700' }}>Current Match Lineup</h4>
                      </div>

                      <div className="responsive-grid-1 responsive-gap-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {/* Team 1 Side */}
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Team 1 <span style={{ padding: '2px 6px', background: 'rgba(22,163,74,0.1)', borderRadius: '4px', fontSize: '9px' }}>{busySlots[selectedSlots[0]].team1}/6</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {busySlots[selectedSlots[0]].team1Slots?.map((p, idx) => (
                              <div key={idx} style={{ padding: '8px 10px', background: 'var(--secondary)', borderRadius: '10px', border: '1px solid var(--glass-border)', fontSize: '12px' }}>
                                <div style={{ fontWeight: '600', color: 'var(--foreground)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{p.type.toLowerCase()}</span>
                                  <span>x{p.count}</span>
                                </div>
                              </div>
                            ))}
                            {busySlots[selectedSlots[0]].team1 < 6 && (
                              <div style={{ padding: '8px', border: '1px dashed var(--glass-border)', borderRadius: '10px', textAlign: 'center', fontSize: '10px', color: 'var(--muted)' }}>
                                {6 - busySlots[selectedSlots[0]].team1} spots left
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Team 2 Side */}
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Team 2 <span style={{ padding: '2px 6px', background: 'rgba(59,130,246,0.1)', borderRadius: '4px', fontSize: '9px' }}>{busySlots[selectedSlots[0]].team2}/6</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {busySlots[selectedSlots[0]].team2Slots?.map((p, idx) => (
                              <div key={idx} style={{ padding: '8px 10px', background: 'var(--secondary)', borderRadius: '10px', border: '1px solid var(--glass-border)', fontSize: '12px' }}>
                                <div style={{ fontWeight: '600', color: 'var(--foreground)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{p.type.toLowerCase()}</span>
                                  <span>x{p.count}</span>
                                </div>
                              </div>
                            ))}
                            {busySlots[selectedSlots[0]].team2 < 6 && (
                              <div style={{ padding: '8px', border: '1px dashed var(--glass-border)', borderRadius: '10px', textAlign: 'center', fontSize: '10px', color: 'var(--muted)' }}>
                                {6 - busySlots[selectedSlots[0]].team2} spots left
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Player Instructions */}
                <div style={{
                  padding: '14px 16px', borderRadius: '12px', marginBottom: '16px',
                  background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)',
                  fontSize: '12px', color: 'var(--muted)', lineHeight: '1.7',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: '700', color: '#38bdf8', fontSize: '13px' }}>
                    <Info size={14} /> Important Instructions
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    <li>Booking is confirmed only when each team has at least <strong>3 players</strong>.</li>
                    <li>Cancellation 24+ hrs before: <strong>100% refund</strong>. 12-24 hrs: <strong>50%</strong>. Under 12 hrs: <strong>no refund</strong>.</li>
                    <li>Non-marking shoes are mandatory on the turf.</li>
                    <li>You can select <strong>multiple time slots</strong> in a single booking.</li>
                  </ul>
                </div>

                {/* Total amount display */}
                {selectedSlots.length > 0 && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 16px', borderRadius: '12px', marginBottom: '16px',
                    background: 'var(--secondary)', border: '1px solid var(--glass-border)',
                  }}>
                    <span style={{ fontSize: '14px', color: 'var(--muted)' }}>{selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''} × ₹{venue.pricePerHour}</span>
                    <span style={{ fontSize: '20px', fontWeight: '800' }}>₹{venue.pricePerHour * selectedSlots.length}</span>
                  </div>
                )}

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
