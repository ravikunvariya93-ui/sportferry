'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle, Navigation, Zap, Shield, CalendarCheck, AlertCircle, User2, Trophy } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './VenueDetail.module.css';

export default function VenueDetailClient({ venue }) {
  const { data: session } = useSession();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [busySlots, setBusySlots] = useState({});
  const [bookingState, setBookingState] = useState('idle');
  const [classification, setClassification] = useState('SOLO');
  const [playersCount, setPlayersCount] = useState(1);
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingId, setBookingId] = useState(null);
  const [activeSlot, setActiveSlot] = useState('06:00 AM – 07:00 AM');
  const [activeTab, setActiveTab] = useState('overview');
  const [preferredTeam, setPreferredTeam] = useState('team1'); // 'team1' | 'team2'

  /* ── Fetch slot availability ── */
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const r = await fetch(`/api/venues/${venue._id}/availability?date=${selectedDate}`, { signal: ctrl.signal });
        if (r.ok) { const d = await r.json(); setBusySlots(d.slotStats || {}); }
      } catch (e) { if (e.name !== 'AbortError') console.error(e); }
    })();
    return () => ctrl.abort();
  }, [selectedDate, venue._id]);

  const slots = [
    '06:00 AM – 07:00 AM','07:00 AM – 08:00 AM','08:00 AM – 09:00 AM',
    '09:00 AM – 10:00 AM','10:00 AM – 11:00 AM','11:00 AM – 12:00 PM',
    '12:00 PM – 01:00 PM','01:00 PM – 02:00 PM','02:00 PM – 03:00 PM',
    '03:00 PM – 04:00 PM','04:00 PM – 05:00 PM','05:00 PM – 06:00 PM',
    '06:00 PM – 07:00 PM','07:00 PM – 08:00 PM','08:00 PM – 09:00 PM',
    '09:00 PM – 10:00 PM','10:00 PM – 11:00 PM','11:00 PM – 12:00 AM',
  ];

  const hasPassed = (slot) => {
    if (selectedDate !== new Date().toISOString().split('T')[0]) return false;
    const [startTimeStr] = slot.split(' – ');
    const [time, meridiem] = startTimeStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    const t = new Date(); t.setHours(h, m, 0, 0);
    return t < new Date();
  };

  const toggleSlot = (slot) => {
    setSelectedSlots(p => p.includes(slot) ? p.filter(s => s !== slot) : [...p, slot]);
    setBookingState('idle');
  };

  /* ── Payment flow ── */
  const handleBook = async () => {
    if (!session) { router.push('/login'); return; }
    if (!selectedSlots.length) { setBookingState('error'); setBookingMessage('Select at least one slot.'); return; }
    setBookingState('loading');
    try {
      const r1 = await fetch('/api/payments/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: venue._id, date: selectedDate, slots: selectedSlots, sport: venue.sportTypes[0], classification, playersCount }),
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

  const mapQ = encodeURIComponent(`${venue.area}, ${venue.city}, Sports`);
  const total = venue.pricePerHour * selectedSlots.length * playersCount;

  return (
    <div className={styles.page}>

      {/* ════════ HERO ════════ */}
      <section className={styles.hero}>
        <img className={styles.heroImg} src={venue.images?.[0] || 'https://images.unsplash.com/photo-1529900948632-586bc48be71a?auto=format&fit=crop&q=80&w=1600'} alt={venue.name} />
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
          </div>
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
              {/* Date */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Date</label>
                <input type="date" value={selectedDate} min={new Date().toISOString().split('T')[0]}
                  onChange={e => { setSelectedDate(e.target.value); setBookingState('idle'); }}
                  style={{ width: '100%', padding: '14px', background: 'var(--background)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'var(--foreground)', fontSize: '14px', fontWeight: '600' }}
                />
              </div>

              {/* Type + Players */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Booking Type</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['SOLO','TEAM','GROUP'].map(t => {
                      const isGroup = t === 'GROUP';
                      const hasPartialBookings = selectedSlots.some(s => (busySlots[s]?.total || 0) > 0);
                      const groupDisabled = isGroup && hasPartialBookings;

                      return (
                        <button key={t} 
                          disabled={groupDisabled}
                          onClick={() => { 
                            setClassification(t); 
                            setPlayersCount(t==='SOLO'?1:t==='TEAM'?3:12); 
                          }}
                          style={{ 
                            flex: 1, padding: '10px 0', borderRadius: '10px', fontSize: '12px', fontWeight: '700', 
                            cursor: groupDisabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                            background: classification===t ? 'var(--primary)' : 'var(--background)', 
                            color: classification===t ? 'white' : 'var(--foreground)',
                            border: classification===t ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
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
                  <select value={playersCount} onChange={e => setPlayersCount(+e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'var(--background)', border: '1px solid var(--glass-border)', fontWeight: '600', fontSize: '14px' }}>
                    {classification==='SOLO' && [1,2].map(n=><option key={n} value={n}>{n}</option>)}
                    {classification==='TEAM' && [3,4,5,6].map(n=><option key={n} value={n}>{n}</option>)}
                    {classification==='GROUP' && <option value={12}>12</option>}
                  </select>
                </div>
              </div>

              {/* Slot grid */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700' }}>Time Slots</label>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{selectedSlots.length} selected</span>
                </div>
                <div className={styles.slotGrid}>
                  {slots.map(slot => {
                    const stats = busySlots[slot] || { total: 0 };
                    const full = stats.total >= 12;
                    const hp = hasPassed(slot);
                    const sel = selectedSlots.includes(slot);
                    const dis = full || hp;
                    return (
                      <button key={slot} disabled={dis || (classification==='GROUP' && stats.total > 0)}
                        className={`${styles.slotBtn} ${sel ? styles.slotBtnSelected : ''}`}
                        onClick={() => { toggleSlot(slot); setActiveSlot(slot); }}>
                        {slot.split(' – ')[0]}
                        <span style={{ fontSize: '9px', marginTop: '3px', opacity: 0.6 }}>{hp ? 'PASSED' : full ? 'FULL' : `${stats.total}/12`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ════════ LIVE MATCH LINEUP (INLINE) ════════ */}
              <div style={{ padding: '20px', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={16} color="#fbbf24" />
                    <span style={{ fontSize: '14px', fontWeight: '800' }}>Lineup: {activeSlot.split(' – ')[0]}</span>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)' }}>
                    {busySlots[activeSlot]?.total || 0}/12 PLAYERS
                  </div>
                </div>

                <div className={styles.teamsGrid}>
                  {/* Team Alpha */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--primary)' }}>TEAM A</span>
                      <span style={{ fontSize: '10px', fontWeight: '700' }}>{busySlots[activeSlot]?.team1 || 0}/6</span>
                    </div>
                    <div className={styles.playerGrid}>
                      {(() => {
                        const sel = selectedSlots.includes(activeSlot);
                        const isPreferred = preferredTeam === 'team1' || classification === 'GROUP';
                        let emptyHighlighted = 0;
                        return [...Array(6)].map((_, i) => {
                          const p = busySlots[activeSlot]?.team1Slots?.[i];
                          const isMySpot = !p && sel && isPreferred && emptyHighlighted < (classification === 'GROUP' ? 6 : playersCount);
                          if (isMySpot) emptyHighlighted++;
                          return (
                            <div key={i} className={styles.playerSpot}
                              onClick={() => {
                                if (!p) {
                                  setPreferredTeam('team1');
                                  toggleSlot(activeSlot);
                                }
                              }}
                              style={{
                                border: p ? '2px solid var(--primary)' : isMySpot ? '2px solid var(--primary)' : undefined,
                                background: p ? 'rgba(22,163,74,0.08)' : isMySpot ? 'rgba(22,163,74,0.06)' : undefined,
                              }}
                            >
                              {p ? (
                                <Link href={`/profile/${p.userId || ''}`} 
                                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--foreground)' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <User2 size={14} color="var(--primary)" />
                                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                                </Link>
                              ) : isMySpot ? (
                                <><CheckCircle size={14} color="var(--primary)" /> <span style={{ color: 'var(--primary)' }}>Your Spot</span></>
                              ) : (
                                <><div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--glass-border)' }} /> <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Open Spot</span></>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--muted)', opacity: 0.2 }}>VS</div>

                  {/* Team Bravo */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '900', color: '#3b82f6' }}>TEAM B</span>
                      <span style={{ fontSize: '10px', fontWeight: '700' }}>{busySlots[activeSlot]?.team2 || 0}/6</span>
                    </div>
                    <div className={styles.playerGrid}>
                      {(() => {
                        const sel = selectedSlots.includes(activeSlot);
                        const isPreferred = preferredTeam === 'team2' || classification === 'GROUP';
                        let emptyHighlighted = 0;
                        return [...Array(6)].map((_, i) => {
                          const p = busySlots[activeSlot]?.team2Slots?.[i];
                          const isMySpot = !p && sel && isPreferred && emptyHighlighted < (classification === 'GROUP' ? 6 : playersCount);
                          if (isMySpot) emptyHighlighted++;
                          return (
                            <div key={i} className={styles.playerSpot}
                              onClick={() => {
                                if (!p) {
                                  setPreferredTeam('team2');
                                  toggleSlot(activeSlot);
                                }
                              }}
                              style={{
                                border: p ? '2px solid #3b82f6' : isMySpot ? '2px solid #3b82f6' : undefined,
                                background: p ? 'rgba(59,130,246,0.08)' : isMySpot ? 'rgba(59,130,246,0.06)' : undefined,
                              }}
                            >
                              {p ? (
                                <Link href={`/profile/${p.userId || ''}`} 
                                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--foreground)' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <User2 size={14} color="#3b82f6" />
                                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                                </Link>
                              ) : isMySpot ? (
                                <><CheckCircle size={14} color="#3b82f6" /> <span style={{ color: '#3b82f6' }}>Your Spot</span></>
                              ) : (
                                <><div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--glass-border)' }} /> <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Open Spot</span></>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total */}
            <div style={{ margin: '20px 0', padding: '16px', background: 'var(--background)', borderRadius: '14px', border: '1px dashed var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: 'var(--muted)' }}>{selectedSlots.length} × {playersCount}p × ₹{venue.pricePerHour}</span>
              <span style={{ fontSize: '20px', fontWeight: '800' }}>₹{total}</span>
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
