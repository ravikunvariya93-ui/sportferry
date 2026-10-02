'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle, Navigation, Zap, Shield, CalendarCheck, AlertCircle, Trophy, LayoutGrid } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './VenueDetail.module.css';

export default function VenueDetailClient({ venue }) {
  const { data: session } = useSession();
  const router = useRouter();

  // Internal value stays YYYY-MM-DD (API-compatible); display is always DD-MM-YYYY
  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const toDDMMYYYY = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y}`;
  };
  // Next 30 days for chips — same list everywhere, no locale-dependent native picker
  const dateOptions = React.useMemo(() => {
    const out = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const iso = toISO(d);
      out.push({
        iso,
        label: toDDMMYYYY(iso),
        dayName: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        dayNum: String(d.getDate()).padStart(2, '0'),
        monthShort: d.toLocaleDateString('en-GB', { month: 'short' }),
      });
    }
    return out;
  }, []);

  // Each booking form owns its dates + slots + type + players + team.
  // Booking 1 is always visible; "Add More Slots" appends Booking 2, 3…
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const newBookingForm = () => ({
    key: Math.random().toString(36).slice(2),
    selectedDate: todayISO(), // one date per booking
    selectedSlot: null, // one slot per booking
    classification: 'SOLO',
    playersCount: 1,
    preferredTeam: 'team1', // 'team1' | 'team2'
  });
  const [bookingForms, setBookingForms] = useState(() => [newBookingForm()]);
  const [busyByDate, setBusyByDate] = useState({}); // { 'YYYY-MM-DD': slotStats } (shared)
  const [bookingState, setBookingState] = useState('idle');
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingId, setBookingId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeImg, setActiveImg] = useState(0); // gallery hero index

  const updateForm = (key, patch) => {
    setBookingForms(prev => prev.map(f => f.key === key ? { ...f, ...patch } : f));
  };

  /* ── Fetch slot availability for every date used by any booking ── */
  const allUsedDates = [...new Set(bookingForms.map(f => f.selectedDate))].sort();
  useEffect(() => {
    const ctrls = allUsedDates.map(() => new AbortController());
    allUsedDates.forEach((iso, i) => {
      (async () => {
        try {
          const r = await fetch(`/api/venues/${venue._id}/availability?date=${iso}`, { signal: ctrls[i].signal });
          if (r.ok) {
            const d = await r.json();
            setBusyByDate(prev => ({ ...prev, [iso]: d.slotStats || {} }));
          }
        } catch (e) { if (e.name !== 'AbortError') console.error(e); }
      })();
    });
    return () => ctrls.forEach(c => c.abort());
  }, [allUsedDates.join(','), venue._id]);

  const slots = [
    '06:00 AM – 07:00 AM','07:00 AM – 08:00 AM','08:00 AM – 09:00 AM',
    '09:00 AM – 10:00 AM','10:00 AM – 11:00 AM','11:00 AM – 12:00 PM',
    '12:00 PM – 01:00 PM','01:00 PM – 02:00 PM','02:00 PM – 03:00 PM',
    '03:00 PM – 04:00 PM','04:00 PM – 05:00 PM','05:00 PM – 06:00 PM',
    '06:00 PM – 07:00 PM','07:00 PM – 08:00 PM','08:00 PM – 09:00 PM',
    '09:00 PM – 10:00 PM','10:00 PM – 11:00 PM','11:00 PM – 12:00 AM',
  ];

  const hasPassedFor = (slot, iso) => {
    const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
    if (iso !== today) return false;
    const [startTimeStr] = slot.split(' – ');
    const [time, meridiem] = startTimeStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    const t = new Date(); t.setHours(h, m, 0, 0);
    return t < new Date();
  };

  const toggleDateFor = (formKey, iso) => {
    setBookingState('idle');
    const form = bookingForms.find(f => f.key === formKey);
    if (!form || form.selectedDate === iso) return;
    // One date per booking — switching date clears the picked slot
    updateForm(formKey, { selectedDate: iso, selectedSlot: null });
  };

  const toggleSlotFor = (formKey, slot) => {
    setBookingState('idle');
    const form = bookingForms.find(f => f.key === formKey);
    if (!form) return;
    // One slot per booking — re-tap to deselect
    updateForm(formKey, { selectedSlot: form.selectedSlot === slot ? null : slot });
  };

  const addBookingForm = () => {
    setBookingState('idle');
    setBookingForms(prev => [...prev, newBookingForm()]);
  };

  const removeBookingForm = (key) => {
    setBookingState('idle');
    setBookingForms(prev => (prev.length > 1 ? prev.filter(f => f.key !== key) : prev));
  };

  // Flat list of picked date+slot cells — at most one per booking
  const allCells = bookingForms
    .filter(f => f.selectedSlot)
    .map(f => ({
      date: f.selectedDate, slot: f.selectedSlot,
      classification: f.classification, playersCount: f.playersCount,
    }));

  /* ── Payment flow (multi-date + multi-slot) ── */
  const handleBook = async () => {
    if (!session) { router.push('/login'); return; }
    if (!allCells.length) { setBookingState('error'); setBookingMessage('Select at least one date and slot.'); return; }
    setBookingState('loading');
    try {
      const r1 = await fetch('/api/payments/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: venue._id, selections: allCells, sport: venue.sportTypes[0] }),
      });
      const od = await r1.json();
      if (!r1.ok) { setBookingState('error'); setBookingMessage(od.message || 'Failed.'); return; }
      const rzp = new window.Razorpay({
        key: od.key_id, amount: od.amount, currency: od.currency, name: 'SportFerry',
        description: `Booking for ${venue.name}`, order_id: od.orderId,
        handler: async (res) => {
          setBookingState('loading'); setBookingMessage('Verifying…');
          const r2 = await fetch('/api/payments/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ razorpay_order_id: res.razorpay_order_id, razorpay_payment_id: res.razorpay_payment_id, razorpay_signature: res.razorpay_signature }),
          });
          const vd = await r2.json();
          if (r2.ok) { setBookingId(vd.bookingIds[0]); setBookingState('success'); }
          else { setBookingState('error'); setBookingMessage(vd.message || 'Verification failed.'); }
        },
        prefill: { name: od.customerName, email: od.customerEmail, contact: od.customerPhone },
        theme: { color: '#16a34a' },
        modal: { ondismiss: () => setBookingState('idle') },
      });
      rzp.open();
    } catch { setBookingState('error'); setBookingMessage('Something went wrong.'); }
  };

  const firstUpcomingFor = (iso) => slots.filter(s => !hasPassedFor(s, iso))[0];

  /* ── BookMyShow-style lineup block for one date+slot cell ── */
  // animIdx staggers entrance so 2nd, 3rd… lineups cascade in visibly
  const renderLineup = (form, iso, slotLabel, isPreview, animIdx = 0) => {
    const stats = busyByDate[iso]?.[slotLabel] || { total: 0, team1: 0, team2: 0, team1Slots: [], team2Slots: [] };
    const isSelected = form.selectedSlot === slotLabel;
    const past = hasPassedFor(slotLabel, iso);
    return (
      <div key={`${form.key}|${iso}|${slotLabel}`} className={styles.lineupEnter} style={{ padding: '20px 16px 16px', background: 'var(--background)', borderRadius: '16px', border: isPreview ? '1px dashed var(--glass-border)' : '1px solid var(--glass-border)', marginBottom: '12px', animationDelay: `${Math.min(animIdx, 6) * 110}ms` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={16} color="#fbbf24" />
            <span style={{ fontSize: '14px', fontWeight: '800' }}>{slotLabel}</span>
            {isPreview && <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', background: 'var(--secondary)', padding: '3px 10px', borderRadius: '100px' }}>PREVIEW — tap a seat to add</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)' }}>{stats.total || 0}/12 JOINED</span>
            {isSelected && (
              <button onClick={() => { updateForm(form.key, { selectedSlot: null }); setBookingState('idle'); }} title="Remove this slot"
                style={{ background: 'none', border: '1px solid var(--glass-border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--muted)', fontSize: '12px', padding: '2px 8px', fontFamily: 'inherit' }}>✕</button>
            )}
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>{toDDMMYYYY(iso)}</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginBottom: '18px', fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '18px', height: '16px', borderRadius: '5px 5px 3px 3px', border: '1.5px solid #16a34a', background: 'transparent', display: 'inline-block' }} /> Available
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '18px', height: '16px', borderRadius: '5px 5px 3px 3px', background: '#16a34a', border: '1.5px solid #16a34a', display: 'inline-block' }} /> Selected
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '18px', height: '16px', borderRadius: '5px 5px 3px 3px', background: '#d1d5db', border: '1.5px solid #d1d5db', display: 'inline-block' }} /> Booked
          </span>
        </div>

        {[
          { key: 'team1', label: 'TEAM A', color: '#16a34a', light: 'rgba(22,163,74,0.12)', count: stats.team1 || 0, slotsArr: stats.team1Slots || [] },
          { key: 'team2', label: 'TEAM B', color: '#3b82f6', light: 'rgba(59,130,246,0.12)', count: stats.team2 || 0, slotsArr: stats.team2Slots || [] },
        ].map((row, rowIdx) => {
                  const isPreferred = form.preferredTeam === row.key || form.classification === 'GROUP';
                  const spotsToHighlight = isSelected && isPreferred ? (form.classification === 'GROUP' ? 6 : form.playersCount) : 0;
          let highlighted = 0;
          return (
            <React.Fragment key={row.key}>
            {rowIdx === 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0 16px' }}>
                <div style={{ flex: 1, height: '2px', background: 'var(--glass-border)' }} />
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  border: '2px solid var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: '900', color: 'var(--primary)',
                  background: 'var(--background)', flexShrink: 0,
                }}>VS</div>
                <div style={{ flex: 1, height: '2px', background: 'var(--glass-border)' }} />
              </div>
            )}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '1px', color: row.color }}>{row.label}</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--muted)' }}>{row.count}/6</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {[...Array(6)].map((_, i) => {
                  const p = row.slotsArr[i];
                  if (p) {
                    return (
                      <Link key={i} href={`/profile/${p.userId || ''}`} title={p.name}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '46px', height: '44px', borderRadius: '10px 10px 6px 6px',
                          background: '#d1d5db', border: '1.5px solid #d1d5db', color: '#6b7280',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', fontWeight: '800', textDecoration: 'none',
                        }}>
                        {(p.name || 'M').charAt(0).toUpperCase()}
                      </Link>
                    );
                  }
                  const isMySeat = !past && highlighted < spotsToHighlight;
                  if (isMySeat) highlighted++;
                  return (
                    <button key={i} title={isMySeat ? 'Your seat' : `${row.label} seat ${i + 1}`}
                      disabled={past} className={isMySeat ? styles.seatPop : undefined}
                              onClick={() => {
                                if (past) return;
                                // BMS-style: tapping a seat picks this slot (one slot per booking)
                                updateForm(form.key, { preferredTeam: row.key, selectedSlot: slotLabel });
                                setBookingState('idle');
                              }}
                      style={{
                        width: '46px', height: '44px', borderRadius: '10px 10px 6px 6px',
                        border: `1.5px solid ${row.color}`,
                        background: isMySeat ? row.color : 'transparent',
                        color: isMySeat ? 'white' : row.color,
                        fontSize: '13px', fontWeight: '800', cursor: past ? 'not-allowed' : 'pointer',
                        opacity: past ? 0.4 : 1, fontFamily: 'inherit',
                        boxShadow: isMySeat ? `0 3px 10px ${row.light}` : 'none',
                      }}>
                      {isMySeat ? '✓' : i + 1}
                    </button>
                  );
                })}
              </div>
              {row.slotsArr.length > 0 && (
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px', textAlign: 'center' }}>
                  {row.slotsArr.map(s => s.name).filter(Boolean).join(', ')}
                </div>
              )}
            </div>
            </React.Fragment>
          );
        })}

        <div style={{ borderTop: '1px dashed var(--glass-border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {isSelected
              ? `${form.playersCount} seat${form.playersCount > 1 ? 's' : ''} • ${form.preferredTeam === 'team1' ? 'Team A' : form.preferredTeam === 'team2' ? 'Team B' : ''}`
              : 'Tap an available seat to pick your side'}
          </span>
          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)' }}>₹{venue.pricePerHour * form.playersCount}<span style={{ fontWeight: '400', color: 'var(--muted)' }}> total</span></span>
        </div>
      </div>
    );
  };

  const mapQ = encodeURIComponent(`${venue.area}, ${venue.city}, Sports`);
  const total = allCells.reduce((s, c) => s + venue.pricePerHour * (c.playersCount || 1), 0);

  return (
    <div className={styles.page}>

      {/* ════════ HERO ════════ */}
      <section className={styles.hero}>
        <img className={styles.heroImg} src={venue.images?.[activeImg] || venue.images?.[0] || 'https://images.unsplash.com/photo-1529900948632-586bc48be71a?auto=format&fit=crop&q=80&w=1600'} alt={venue.name} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadges}>
            {venue.sportTypes.map(s => (
              <span key={s} className={styles.badge} style={{ background: 'var(--primary)', color: 'white' }}>{s}</span>
            ))}
            <span className={styles.badge} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(8px)' }}>⭐ {Number(venue.rating || 4.5).toFixed(1)}</span>
          </div>
          <h1 className={styles.heroTitle}>{venue.name}</h1>
          <div className={styles.heroMeta}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16} /> {venue.area}, {venue.city}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} /> 6 AM – 12 AM</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><LayoutGrid size={16} /> {venue.numberOfTurfs || 1} Turf{(venue.numberOfTurfs || 1) !== 1 ? 's' : ''}</span>
          </div>
          {/* Gallery thumbnails */}
          {(venue.images?.length || 0) > 1 && (
            <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
              {venue.images.map((src, i) => (
                <button key={src + i} onClick={() => setActiveImg(i)} title={`Photo ${i + 1}`}
                  style={{
                    border: activeImg === i ? '2px solid white' : '2px solid transparent',
                    borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', padding: 0,
                    opacity: activeImg === i ? 1 : 0.75, background: 'none',
                  }}>
                  <img src={src} alt="" style={{ width: '56px', height: '40px', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════ TABS + CONTENT ════════ */}
      <div className={styles.card}>
        <div className={styles.tabsRow}>
          {['overview','amenities','location'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`${styles.tab} ${activeTab === t ? styles.activeTab : ''}`}>{t}</button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '800' }}>About the Venue</h2>
            <p style={{ color: 'var(--muted)', lineHeight: '1.8', fontSize: '15px' }}>
              Welcome to <strong style={{ color: 'var(--foreground)' }}>{venue.name}</strong> in {venue.area}. We offer top-tier {venue.sportTypes[0]} facilities with professional-grade surfaces and floodlights for night play. Perfect for casual matches, corporate events, or tournaments.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '16px', background: 'var(--background)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', marginBottom: '6px', fontSize: '14px' }}><Clock size={16} color="var(--primary)" /> Timing</div>
                <div style={{ color: 'var(--muted)', fontSize: '13px' }}>Everyday: 6:00 AM – 11:59 PM</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--background)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', marginBottom: '6px', fontSize: '14px' }}><Shield size={16} color="var(--primary)" /> Rules</div>
                <div style={{ color: 'var(--muted)', fontSize: '13px' }}>Non-marking shoes only.</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'amenities' && (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '20px' }}>Amenities</h2>
            <div className={styles.amenitiesGrid}>
              {(venue.amenities?.length ? venue.amenities : ['Parking','Drinking Water','Restrooms','Floodlights','Seating Area','Equipment']).map(a => (
                <div key={a} className={styles.amenityItem}>
                  <CheckCircle size={18} color="var(--primary)" />
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'location' && (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '12px' }}>Location</h2>
            <div style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '14px' }}><Navigation size={16} /> {venue.address}, {venue.city}</div>
            <div style={{ height: '300px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://maps.google.com/maps?width=100%25&height=600&hl=en&q=${mapQ}&t=&z=14&ie=UTF8&iwloc=B&output=embed`}></iframe>
            </div>
          </div>
        )}
      </div>



      {/* ════════ BOOKING CARD ════════ */}
      <div className={`${styles.card} ${styles.bookingCard}`}>
        {bookingState === 'success' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CalendarCheck size={36} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>Booking Confirmed!</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>Ref: {bookingId}</p>
            <button onClick={() => router.push('/bookings')} className={styles.bookBtn}>View My Bookings</button>
          </div>
        ) : (
          <>
            {/* Price header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '28px', fontWeight: '800' }}>₹{venue.pricePerHour}</span>
                <span style={{ fontSize: '14px', color: 'var(--muted)' }}> /hour</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)', background: 'rgba(22,163,74,0.1)', padding: '6px 14px', borderRadius: '100px' }}>Best Price</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Booking forms — Booking 1 first; "Add More Slots" appends Booking 2, 3… each with own date, type, players, slots, lineups */}
              {bookingForms.map((form, fi) => {
                const hasSlot = !!form.selectedSlot;
                const formSubtotal = hasSlot ? venue.pricePerHour * form.playersCount : 0;
                return (
                <div key={form.key} className={styles.dateSectionEnter} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px', borderRadius: '18px', border: '1.5px solid var(--glass-border)', background: 'var(--secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800' }}>Booking {fi + 1}
                      <span style={{ color: 'var(--muted)', fontWeight: '400', fontSize: '12px' }}> • {hasSlot ? `${toDDMMYYYY(form.selectedDate)} • ${form.selectedSlot}` : 'no slot picked'} • ₹{formSubtotal}</span>
                    </span>
                    {bookingForms.length > 1 && (
                      <button onClick={() => removeBookingForm(form.key)} title="Remove this booking"
                        style={{ background: 'none', border: '1px solid var(--glass-border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--muted)', fontSize: '11px', padding: '4px 10px', fontFamily: 'inherit' }}>
                        Remove ✕
                      </button>
                    )}
                  </div>
              {/* Date — single pick, always DD-MM-YYYY (custom chips, no locale-dependent native picker) */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', display: 'block' }}>
                  Date <span style={{ color: 'var(--primary)' }}>{toDDMMYYYY(form.selectedDate)}</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'thin' }}>
                  {dateOptions.map(o => {
                    const sel = form.selectedDate === o.iso;
                    return (
                      <button
                        key={o.iso}
                        onClick={() => toggleDateFor(form.key, o.iso)}
                        title={o.label}
                        style={{
                          flex: '0 0 auto', minWidth: '64px', padding: '10px 8px', borderRadius: '12px',
                          border: sel ? '1.5px solid var(--primary)' : '1px solid var(--glass-border)',
                          background: sel ? 'var(--primary)' : 'var(--background)',
                          color: sel ? 'white' : 'var(--foreground)',
                          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                          transition: 'all 0.25s ease', transform: sel ? 'scale(1.05)' : 'scale(1)',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: '700', opacity: sel ? 0.9 : 0.6 }}>{o.dayName}</div>
                        <div style={{ fontSize: '16px', fontWeight: '800' }}>{o.dayNum}{sel ? ' ✓' : ''}</div>
                        <div style={{ fontSize: '11px', fontWeight: '600', opacity: sel ? 0.9 : 0.6 }}>{o.monthShort}</div>
                        <div style={{ fontSize: '10px', fontWeight: '600', opacity: sel ? 0.85 : 0.55, marginTop: '2px' }}>{o.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Type + Players (per booking) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Booking Type</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['SOLO','TEAM','GROUP'].map(t => {
                      const isGroup = t === 'GROUP';
                      const hasPartialBookings = form.selectedSlot
                        ? ((busyByDate[form.selectedDate]?.[form.selectedSlot]?.total || 0) > 0)
                        : false;
                      const groupDisabled = isGroup && hasPartialBookings;

                      return (
                        <button key={t} 
                          disabled={groupDisabled}
                          onClick={() => {
                            updateForm(form.key, { classification: t, playersCount: t==='SOLO'?1:t==='TEAM'?3:12 });
                            setBookingState('idle');
                          }}
                          style={{ 
                            flex: 1, padding: '10px 0', borderRadius: '10px', fontSize: '12px', fontWeight: '700', 
                            cursor: groupDisabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                            background: form.classification===t ? 'var(--primary)' : 'var(--background)', 
                            color: form.classification===t ? 'white' : 'var(--foreground)',
                            border: form.classification===t ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                            opacity: groupDisabled ? 0.3 : 1
                          }}
                          title={groupDisabled ? "Group booking only available for completely empty slots" : ""}
                        >{t.charAt(0)+t.slice(1).toLowerCase()}</button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Players</label>
                  <select value={form.playersCount} onChange={e => { updateForm(form.key, { playersCount: +e.target.value }); setBookingState('idle'); }}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'var(--background)', border: '1px solid var(--glass-border)', fontWeight: '600', fontSize: '14px' }}>
                    {form.classification==='SOLO' && [1,2].map(n=><option key={n} value={n}>{n}</option>)}
                    {form.classification==='TEAM' && [3,4,5,6].map(n=><option key={n} value={n}>{n}</option>)}
                    {form.classification==='GROUP' && <option value={12}>12</option>}
                  </select>
                </div>
              </div>

              {/* Slot grid (single pick) + lineup for this booking */}
              {(() => {
                const iso = form.selectedDate;
                const dayBusy = busyByDate[iso] || {};
                const sel = form.selectedSlot;
                const preview = sel || firstUpcomingFor(iso);
                return (
                  <div style={{ padding: '14px', background: 'var(--background)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '800' }}>
                        Slots <span style={{ color: 'var(--muted)', fontWeight: '400' }}>• pick 1</span>
                      </label>
                    </div>
                    <div className={styles.slotGrid}>
                      {slots.map(slot => {
                        const stats = dayBusy[slot] || { total: 0 };
                        const full = stats.total >= 12;
                        const hp = hasPassedFor(slot, iso);
                        const isSel = sel === slot;
                        const dis = full || hp;
                        return (
                          <button key={slot} disabled={dis || (form.classification==='GROUP' && stats.total > 0)}
                            className={`${styles.slotBtn} ${isSel ? styles.slotBtnSelected : ''}`}
                            onClick={() => toggleSlotFor(form.key, slot)}>
                            {slot.split(' – ')[0]}
                            <span style={{ fontSize: '10px', marginTop: '1px', opacity: 0.9 }}>– {slot.split(' – ')[1]}</span>
                            <span style={{ fontSize: '9px', marginTop: '3px', opacity: 0.6 }}>{hp ? 'PASSED' : full ? 'FULL' : `${stats.total}/12`}</span>
                          </button>
                        );
                      })}
                    </div>
                    {/* Lineup for the picked slot (preview of first upcoming if none picked yet) */}
                    {preview && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {renderLineup(form, iso, preview, !sel, 0)}
                      </div>
                    )}
                  </div>
                );
              })()}
                </div>
                );
              })}

              {/* Add More Slots — appends Booking 2, 3… with its own date, type, players, slots, lineups */}
              <button onClick={addBookingForm}
                style={{
                  width: '100%', padding: '14px', borderRadius: '14px',
                  border: '1.5px dashed var(--primary)', background: 'rgba(22,163,74,0.06)',
                  color: 'var(--primary)', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                + Add More Slots (Booking {bookingForms.length + 1})
              </button>

            </div>

            {/* Total — per-booking breakdown + grand total */}
            <div style={{ margin: '20px 0', padding: '16px', background: 'var(--background)', borderRadius: '14px', border: '1px dashed var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {bookingForms.map((f, i) => {
                if (!f.selectedSlot) return null;
                return (
                  <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--muted)' }}>
                    <span>Booking {i + 1}: {toDDMMYYYY(f.selectedDate)} • {f.selectedSlot} • {f.playersCount}p</span>
                    <span style={{ fontWeight: '700', color: 'var(--foreground)' }}>₹{venue.pricePerHour * f.playersCount}</span>
                  </div>
                );
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--glass-border)', paddingTop: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--muted)' }}>{allCells.length} slot{allCells.length !== 1 ? 's' : ''} total</span>
                <span style={{ fontSize: '20px', fontWeight: '800' }}>₹{total}</span>
              </div>
            </div>

            {bookingState === 'error' && (
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '12px', borderRadius: '12px', fontSize: '13px', marginBottom: '12px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} /> {bookingMessage}
              </div>
            )}

            <button onClick={handleBook} disabled={bookingState === 'loading'} className={styles.bookBtn}>
              {bookingState === 'loading' ? 'Processing…' : <><Zap size={18} fill="white" /> {session ? 'Book Now' : 'Sign In to Book'}</>}
            </button>
            <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)', marginTop: '12px' }}>🔒 Secure payment via Razorpay</p>
          </>
        )}
      </div>
    </div>
  );
}
