'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle, Navigation, Zap, Shield, CalendarCheck, AlertCircle, Trophy, LayoutGrid, IndianRupee } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './VenueDetail.module.css';
import { SLOT_LABELS, isSlotLabelPast, formatToAMPM } from '@/lib/ist';
import { PLAYERS_PER_SIDE, slotCapacityFor, allocateBooking, existingFromSlotStats, blockReason } from '@/lib/capacity';
import { hasCoords, mapsEmbedUrl, mapsDirectionsUrl } from '@/lib/geo';
import { discountPercentOf, discountedPrice } from '@/lib/pricing';

// A roster item covers as many seats as it has players — a team of 3 fills
// three seats of its side, not one.
const seatsFor = (slotsArr = []) => {
  const out = [];
  for (const r of slotsArr) {
    const n = Math.max(1, r.count || 1);
    for (let i = 0; i < n; i++) out.push(r);
  }
  return out;
};

export default function VenueDetailClient({ venue }) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // One match per turf → up to 6 players per side (12 total) per turf.
  const sideCapacity = PLAYERS_PER_SIDE;
  const slotCapacity = slotCapacityFor(venue.numberOfTurfs);
  const turfCount = Math.max(1, Number(venue.numberOfTurfs) || 1);
  // Effective price after the venue's discount (0 discount → full price).
  const discount = discountPercentOf(venue);
  const price = discountedPrice(venue.pricePerHour, discount);

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
  // Pre-select the date+slot when arriving from a "Games Near You" card
  // (/venue/[id]?date=YYYY-MM-DD&slot=<12h label | HH:mm>).
  const findSlotLabel = (raw) => {
    if (!raw) return null;
    if (SLOT_LABELS.includes(raw)) return raw;
    const m = /^(\d{2}):(\d{2})$/.exec(raw);
    if (m) {
      const start = formatToAMPM(`${m[1]}:${m[2]}`);
      return SLOT_LABELS.find(l => l.startsWith(`${start} `)) || null;
    }
    return null;
  };
  const paramDate = searchParams.get('date');
  const initialDate = paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) ? paramDate : todayISO();
  const initialSlot = findSlotLabel(searchParams.get('slot'));

  const newBookingForm = (selectedDate = todayISO(), selectedSlot = null) => ({
    key: Math.random().toString(36).slice(2),
    selectedDate, // one date per booking
    selectedSlot, // one slot per booking
    classification: 'SOLO',
    playersCount: 1,
    preferredTeam: 'team1', // 'team1' | 'team2'
  });
  const [bookingForms, setBookingForms] = useState(() => [newBookingForm(initialDate, initialSlot)]);
  const [busyByDate, setBusyByDate] = useState({}); // { 'YYYY-MM-DD': slotStats } (shared)
  const [bookingState, setBookingState] = useState('idle');
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingId, setBookingId] = useState(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
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

  const slots = SLOT_LABELS;

  const hasPassedFor = (slot, iso) => isSlotLabelPast(slot, iso);

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
      preferredSide: f.preferredTeam === 'team2' ? 2 : 1,
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
          if (r2.ok) { setBookingId(vd.bookingIds[0]); setBookingConfirmed(!!vd.confirmed); setBookingState('success'); }
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

  /* ── The server's allocation, mirrored locally so the preview is truthful ── */
  const allocFor = (form, iso, slotLabel) => {
    const stat = busyByDate[iso]?.[slotLabel];
    const existing = existingFromSlotStats(stat);
    const alloc = allocateBooking({
      existingBookings: existing,
      playersCount: form.playersCount,
      classification: form.classification,
      turfCount,
      preferredSide: form.preferredTeam === 'team2' ? 2 : 1,
    });
    return { ...alloc, existing, stat };
  };

  /* ── BookMyShow-style lineup block for one date+slot cell ── */
  // animIdx staggers entrance so 2nd, 3rd… lineups cascade in visibly
  const renderLineup = (form, iso, slotLabel, isPreview, animIdx = 0) => {
    const stats = busyByDate[iso]?.[slotLabel] || { total: 0, turfs: [] };
    const turfMap = {};
    (stats.turfs || []).forEach(t => { turfMap[t.turf] = t; });
    const isSelected = form.selectedSlot === slotLabel;
    const past = hasPassedFor(slotLabel, iso);
    // The turf and side the server will place this booking on.
    const alloc = allocFor(form, iso, slotLabel);
    const currentTurf = alloc.turf || 1;
    const assignedKey = alloc.assignedSide === 2 ? 'team2' : alloc.assignedSide === 1 ? 'team1' : null;
    return (
      <div key={`${form.key}|${iso}|${slotLabel}`} className={styles.lineupEnter} style={{ padding: '20px 16px 16px', background: 'var(--background)', borderRadius: '16px', border: isPreview ? '1px dashed var(--glass-border)' : '1px solid var(--glass-border)', marginBottom: '12px', animationDelay: `${Math.min(animIdx, 6) * 110}ms` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={16} color="#fbbf24" />
            <span style={{ fontSize: '14px', fontWeight: '800' }}>{slotLabel}</span>
            {isPreview && <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', background: 'var(--secondary)', padding: '3px 10px', borderRadius: '100px' }}>PREVIEW — tap a seat to add</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)' }}>{stats.total || 0}/{slotCapacity} JOINED</span>
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

        {(() => {
          const t = currentTurf;
          const ts = turfMap[t] || { turf: t, total: 0, team1: 0, team2: 0, team1Slots: [], team2Slots: [] };
          return (
            <div key={t} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '0.5px' }}>TURF {t}{turfCount > 1 ? ` of ${turfCount}` : ''}</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--muted)' }}>{ts.total}/12</span>
              </div>
              {[
                { key: 'team1', label: 'TEAM A', color: '#16a34a', light: 'rgba(22,163,74,0.12)', count: ts.team1 || 0, slotsArr: ts.team1Slots || [], teamSize: ts.team1Size ?? null },
                { key: 'team2', label: 'TEAM B', color: '#3b82f6', light: 'rgba(59,130,246,0.12)', count: ts.team2 || 0, slotsArr: ts.team2Slots || [], teamSize: ts.team2Size ?? null },
              ].map((row, rowIdx) => {
                  // A team owns its side; the opposite side is reserved for a team of the same size.
                  const oppositeTeamSize = row.key === 'team1' ? ts.team2Size : ts.team1Size;
                  const isTeamSide = row.teamSize != null;
                  const isReserved = !row.slotsArr.length && oppositeTeamSize != null;
                  const isPreferred = form.classification === 'GROUP'
                    || (assignedKey ? assignedKey === row.key : form.preferredTeam === row.key);
                  const spotsToHighlight = isSelected && isPreferred ? (form.classification === 'GROUP' ? 6 : form.playersCount) : 0;
                  const sideLocked = isTeamSide
                    || (isReserved && !(form.classification === 'TEAM' && form.playersCount === oppositeTeamSize));
                  const seats = seatsFor(row.slotsArr);
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
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--muted)' }}>{row.count}/{sideCapacity}</span>
              </div>
              {(isTeamSide || isReserved) && (
                <div style={{ fontSize: '10px', fontWeight: '800', color: row.color, textAlign: 'center', marginTop: '-2px', marginBottom: '8px' }}>
                  {isTeamSide ? `TEAM OF ${row.teamSize}` : `RESERVED FOR ${oppositeTeamSize}-PLAYER TEAM`}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {[...Array(sideCapacity)].map((_, i) => {
                  const p = seats[i];
                  if (p) {
                    const seatStyle = {
                      width: '46px', height: '44px', borderRadius: '10px 10px 6px 6px',
                      background: '#d1d5db', border: '1.5px solid #d1d5db', color: '#6b7280',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: '800', textDecoration: 'none',
                    };
                    // No user id (anonymous visitor) — a plain seat, not a link.
                    if (!p.userId) {
                      return (
                        <div key={i} title={p.name} style={seatStyle}>
                          {(p.name || 'B').charAt(0).toUpperCase()}
                        </div>
                      );
                    }
                    return (
                      <Link key={i} href={`/profile/${p.userId}`} title={p.name}
                        onClick={(e) => e.stopPropagation()}
                        style={seatStyle}>
                        {(p.name || 'M').charAt(0).toUpperCase()}
                      </Link>
                    );
                  }
                  const isMySeat = !past && highlighted < spotsToHighlight;
                  if (isMySeat) highlighted++;
                  return (
                    <button key={i} title={isMySeat ? 'Your seat' : `${row.label} seat ${i + 1}`}
                      disabled={past || sideLocked} className={isMySeat ? styles.seatPop : undefined}
                              onClick={() => {
                                if (past || sideLocked) return;
                                // BMS-style: tapping a seat picks this slot (one slot per booking)
                                updateForm(form.key, { preferredTeam: row.key, selectedSlot: slotLabel });
                                setBookingState('idle');
                              }}
                      style={{
                        width: '46px', height: '44px', borderRadius: '10px 10px 6px 6px',
                        border: `1.5px solid ${row.color}`,
                        background: isMySeat ? row.color : 'transparent',
                        color: isMySeat ? 'white' : row.color,
                        fontSize: '13px', fontWeight: '800', cursor: past || sideLocked ? 'not-allowed' : 'pointer',
                        opacity: past ? 0.4 : sideLocked ? 0.45 : 1, fontFamily: 'inherit',
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
            </div>
          );
        })()}

        <div style={{ borderTop: '1px dashed var(--glass-border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {isSelected
              ? `${form.playersCount} seat${form.playersCount > 1 ? 's' : ''} • ${assignedKey === 'team2' ? 'Team B' : assignedKey === 'team1' ? 'Team A' : ''}`
              : 'Tap an available seat to pick your side'}
          </span>
          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)' }}>₹{price * form.playersCount}<span style={{ fontWeight: '400', color: 'var(--muted)' }}> total</span></span>
        </div>
      </div>
    );
  };

  const mapQ = encodeURIComponent(`${venue.area}, ${venue.city}, Sports`);
  const hasLoc = hasCoords(venue.location);
  const mapSrc = hasLoc
    ? mapsEmbedUrl(venue.location.lat, venue.location.lng, 16)
    : `https://maps.google.com/maps?width=100%25&height=600&hl=en&q=${mapQ}&t=&z=14&ie=UTF8&iwloc=B&output=embed`;
  const total = allCells.reduce((s, c) => s + price * (c.playersCount || 1), 0);

  return (
    <div className={styles.page}>

      {/* ════════ HERO ════════ */}
      <section className={styles.hero}>
        <img className={styles.heroImg} src={venue.images?.[activeImg] || venue.images?.[0] || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=1600'} alt={venue.name} />
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

      {/* ════════ INFO + BOOKING ════════ */}
      <div className={styles.layout}>
        <main className={styles.infoCol}>

          <div className={styles.card}>
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '14px' }}>About {venue.name}</h2>
            <p style={{ color: 'var(--muted)', lineHeight: '1.8', fontSize: '15px', marginBottom: '18px' }}>
              Welcome to <strong style={{ color: 'var(--foreground)' }}>{venue.name}</strong> in {venue.area}. Top-tier {venue.sportTypes[0]} with professional-grade surfaces and floodlights for night play — perfect for casual matches, corporate events, or tournaments.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{ padding: '16px', background: 'var(--background)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', marginBottom: '6px', fontSize: '14px' }}><Clock size={16} color="var(--primary)" /> Timing</div>
                <div style={{ color: 'var(--muted)', fontSize: '13px' }}>Everyday: 6:00 AM – 11:59 PM</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--background)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', marginBottom: '6px', fontSize: '14px' }}><LayoutGrid size={16} color="var(--primary)" /> Turfs</div>
                <div style={{ color: 'var(--muted)', fontSize: '13px' }}>{venue.numberOfTurfs || 1} turf{(venue.numberOfTurfs || 1) !== 1 ? 's' : ''} — play more, wait less</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--background)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', marginBottom: '6px', fontSize: '14px' }}><IndianRupee size={16} color="var(--primary)" /> Price</div>
                <div style={{ color: 'var(--muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>₹{price} per hour per player</span>
                  {discount > 0 && (
                    <>
                      <span style={{ textDecoration: 'line-through' }}>₹{venue.pricePerHour}</span>
                      <span style={{ background: '#ef4444', color: '#fff', padding: '1px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: '800' }}>{discount}% OFF</span>
                    </>
                  )}
                </div>
              </div>
              <div style={{ padding: '16px', background: 'var(--background)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', marginBottom: '6px', fontSize: '14px' }}><Shield size={16} color="var(--primary)" /> Rules</div>
                <div style={{ color: 'var(--muted)', fontSize: '13px' }}>Non-marking shoes only.</div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '18px' }}>Amenities</h2>
            <div className={styles.amenitiesGrid}>
              {(venue.amenities?.length ? venue.amenities : ['Parking','Drinking Water','Restrooms','Floodlights','Seating Area','Equipment']).map(a => (
                <div key={a} className={styles.amenityItem}>
                  <CheckCircle size={18} color="var(--primary)" />
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{a}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '12px' }}>Location</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><Navigation size={16} /> {venue.address}, {venue.city}</div>
              {hasLoc && (
                <a
                  href={mapsDirectionsUrl(venue.location.lat, venue.location.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--primary)', color: '#fff', padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  <Navigation size={14} /> Get Directions
                </a>
              )}
            </div>
            <div style={{ height: '300px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={mapSrc}></iframe>
            </div>
          </div>

        </main>
        <aside className={styles.bookCol}>



      {/* ════════ BOOKING CARD ════════ */}
      <div className={`${styles.card} ${styles.bookingCard}`}>
        {bookingState === 'success' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CalendarCheck size={36} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>
              {bookingConfirmed ? 'Booking Confirmed!' : 'Payment received'}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
              {bookingConfirmed
                ? `Ref: ${bookingId}`
                : `Ref: ${bookingId} — your spot is held. It confirms once enough players join this turf.`}
            </p>
            <button onClick={() => router.push('/bookings')} className={styles.bookBtn}>View My Bookings</button>
          </div>
        ) : (
          <>
            {/* Price header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '28px', fontWeight: '800' }}>₹{price}</span>
                <span style={{ fontSize: '14px', color: 'var(--muted)' }}> /hour</span>
                {discount > 0 && (
                  <>
                    <span style={{ fontSize: '15px', color: 'var(--muted)', textDecoration: 'line-through', marginLeft: '8px' }}>₹{venue.pricePerHour}</span>
                    <span style={{ marginLeft: '8px', background: '#ef4444', color: '#fff', padding: '2px 9px', borderRadius: '100px', fontSize: '12px', fontWeight: '800' }}>{discount}% OFF</span>
                  </>
                )}
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)', background: 'rgba(22,163,74,0.1)', padding: '6px 14px', borderRadius: '100px' }}>Best Price</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Booking forms — Booking 1 first; "Add More Slots" appends Booking 2, 3… each with own date, type, players, slots, lineups */}
              {bookingForms.map((form, fi) => {
                const hasSlot = !!form.selectedSlot;
                const formSubtotal = hasSlot ? price * form.playersCount : 0;
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
                        const hp = hasPassedFor(slot, iso);
                        const isSel = sel === slot;
                        // Same allocation the server runs — a slot can be
                        // partly booked yet unavailable for this booking.
                        const alloc = allocFor(form, iso, slot);
                        const reason = alloc.error
                          ? blockReason(alloc.existing, { playersCount: form.playersCount, classification: form.classification })
                          : null;
                        const groupBlocked = form.classification === 'GROUP' && stats.total > 0;
                        const dis = hp || groupBlocked || !!alloc.error;
                        const note = hp ? 'PASSED'
                          : groupBlocked ? 'NO FREE TURF'
                          : reason ? (form.classification === 'TEAM' ? 'TEAM SIZE' : 'TEAM ONLY')
                          : alloc.error ? 'FULL'
                          : `${stats.total}/${slotCapacity}`;
                        return (
                          <button key={slot} disabled={dis}
                            className={`${styles.slotBtn} ${isSel ? styles.slotBtnSelected : ''}`}
                            onClick={() => toggleSlotFor(form.key, slot)}
                            title={reason || (groupBlocked ? 'Group booking only available for completely empty slots' : '')}>
                            {slot.split(' – ')[0]}
                            <span style={{ fontSize: '10px', marginTop: '1px', opacity: 0.9 }}>– {slot.split(' – ')[1]}</span>
                            <span style={{ fontSize: '9px', marginTop: '3px', opacity: 0.6 }}>{note}</span>
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
                    <span style={{ fontWeight: '700', color: 'var(--foreground)' }}>₹{price * f.playersCount}</span>
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
        </aside>
      </div>
    </div>
  );
}
