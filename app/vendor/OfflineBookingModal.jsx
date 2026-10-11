'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertCircle, CheckCircle2, Lock, LayoutGrid } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SLOT_LABELS, istTodayISO, isSlotLabelPast } from '@/lib/ist';
import { slotCapacityFor, turfCountOf, allocateBooking, PLAYERS_PER_SIDE } from '@/lib/capacity';

const TIME_SLOTS = SLOT_LABELS;
// Allowed player counts per category — mirrors the server's validation.
const CLASS_CHOICES = { SOLO: [1, 2], TEAM: [3, 4, 5, 6], GROUP: [12] };
const DEFAULT_PLAYERS = { SOLO: 1, TEAM: 6, GROUP: 12 };
const TURF_CAPACITY = PLAYERS_PER_SIDE * 2; // 6 per side, 12 per turf

const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px',
  color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
};
const fieldStyle = {
  width: '100%', padding: '14px', background: 'var(--secondary)',
  border: '1px solid var(--glass-border)', borderRadius: '14px',
  color: 'var(--foreground)', outline: 'none', fontFamily: 'inherit', fontSize: '14px',
};

export default function OfflineBookingModal({ venues, onClose }) {
  const router = useRouter();
  const today = istTodayISO();
  const firstVenue = venues[0];

  const [form, setForm] = useState({
    venueId: firstVenue?.id || '',
    date: today,
    slot: '',
    sport: firstVenue?.sportTypes?.[0] || '',
    classification: 'SOLO',
    playersCount: 1,
    customerName: '',
    customerPhone: '',
  });

  const [slotStats, setSlotStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchingAvailability, setFetchingAvailability] = useState(false);
  const [success, setSuccess] = useState(null); // { name, slot, turf }
  const [error, setError] = useState('');

  const selectedVenue = venues.find(v => v.id === form.venueId);
  const turfCount = turfCountOf(selectedVenue?.numberOfTurfs);
  const slotCapacity = slotCapacityFor(selectedVenue?.numberOfTurfs);

  const availabilityControllerRef = React.useRef(null);
  const submitControllerRef = React.useRef(null);

  useEffect(() => () => {
    if (availabilityControllerRef.current) availabilityControllerRef.current.abort();
    if (submitControllerRef.current) submitControllerRef.current.abort();
  }, []);

  const fetchAvailability = useCallback(async () => {
    if (!form.venueId || !form.date) return;

    if (availabilityControllerRef.current) availabilityControllerRef.current.abort();
    availabilityControllerRef.current = new AbortController();
    const signal = availabilityControllerRef.current.signal;

    setFetchingAvailability(true);
    try {
      const res = await fetch(`/api/venues/${form.venueId}/availability?date=${form.date}`, { signal });
      const data = await res.json();
      setSlotStats(data.slotStats || {});
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('Failed to fetch availability', e);
    } finally {
      setFetchingAvailability(false);
    }
  }, [form.venueId, form.date]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Rebuild each slot's individual bookings from the availability stats so the
  // client reuses the SAME per-turf allocation the server runs on submit.
  const existingFor = (slotLabel) => {
    const stat = slotStats[slotLabel];
    if (!stat?.turfs?.length) return [];
    const out = [];
    for (const ts of stat.turfs) {
      for (const r of (ts.team1Slots || [])) out.push({ playersCount: r.count || 1, classification: r.type || 'SOLO', teamSide: 1, turf: ts.turf });
      for (const r of (ts.team2Slots || [])) out.push({ playersCount: r.count || 1, classification: r.type || 'SOLO', teamSide: 2, turf: ts.turf });
    }
    return out;
  };

  const allocationFor = (slotLabel) => allocateBooking({
    existingBookings: existingFor(slotLabel),
    playersCount: form.playersCount,
    classification: form.classification,
    turfCount,
  });

  const slotState = (slotLabel) => {
    if (isSlotLabelPast(slotLabel, form.date)) return { disabled: true, note: 'PASSED' };
    const alloc = allocationFor(slotLabel);
    if (alloc.error) {
      return { disabled: true, note: alloc.error === 'group-needs-empty' ? 'NO FREE TURF' : 'FULL' };
    }
    return { disabled: false, turf: alloc.turf, used: slotStats[slotLabel]?.total || 0 };
  };

  const selectSlot = (slotLabel) => {
    setForm(prev => ({ ...prev, slot: slotLabel }));
    setError('');
  };

  const changeVenue = (venueId) => {
    const v = venues.find(x => x.id === venueId);
    setForm(prev => ({ ...prev, venueId, sport: v?.sportTypes?.[0] || '', slot: '' }));
    setError('');
  };

  const changeClassification = (classification) => {
    setForm(prev => ({ ...prev, classification, playersCount: DEFAULT_PLAYERS[classification], slot: '' }));
    setError('');
  };

  const setPlayers = (playersCount) => {
    setForm(prev => ({ ...prev, playersCount, slot: '' }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.slot) { setError('Please select a time slot.'); return; }
    if (!form.sport) { setError('Please select the sport being played.'); return; }
    if (!form.customerName.trim()) { setError('Please enter the walk-in customer name.'); return; }
    if (slotState(form.slot).disabled) { setError('That slot is no longer available — pick another.'); return; }

    if (submitControllerRef.current) submitControllerRef.current.abort();
    submitControllerRef.current = new AbortController();
    const signal = submitControllerRef.current.signal;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: form.venueId,
          date: form.date,
          slot: form.slot,
          sport: form.sport,
          classification: form.classification,
          playersCount: form.playersCount,
          bookingType: 'OFFLINE',
          offlineCustomerName: form.customerName.trim(),
          offlineCustomerPhone: form.customerPhone.trim() || undefined,
        }),
        signal,
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess({ name: form.customerName.trim(), slot: form.slot, turf: data.turf });
        setTimeout(() => { onClose(); router.refresh(); }, 2000);
      } else {
        setError(data.message || 'Failed to block the slot.');
        fetchAvailability();
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedState = form.slot ? slotState(form.slot) : null;
  const selectedStat = slotStats[form.slot];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-morphism" style={{ width: '100%', maxWidth: '680px', maxHeight: '95vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 10 }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px' }}>Offline Booking</h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '2px' }}>Block a slot for a walk-in player</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--secondary)', border: '1px solid var(--glass-border)', height: '40px', width: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--foreground)' }}>
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: '64px 32px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle2 size={32} color="#16a34a" />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Slot Blocked!</h3>
            <p style={{ color: 'var(--muted)' }}>
              {success.name} · {success.slot}
              {success.turf ? ` · Turf ${success.turf}` : ''}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>

              {/* Venue & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>Select Venue</label>
                  <select
                    value={form.venueId}
                    onChange={(e) => changeVenue(e.target.value)}
                    style={{ ...fieldStyle, appearance: 'none', cursor: 'pointer' }}
                  >
                    {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    min={today}
                    onChange={(e) => { setForm(prev => ({ ...prev, date: e.target.value, slot: '' })); setError(''); }}
                    style={fieldStyle}
                  />
                </div>
              </div>

              {/* Walk-in customer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>Walk-in Customer Name *</label>
                  <input
                    value={form.customerName}
                    onChange={(e) => { setForm(prev => ({ ...prev, customerName: e.target.value })); setError(''); }}
                    placeholder="e.g. Rahul (walk-in)"
                    style={fieldStyle}
                    maxLength={60}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Phone (optional)</label>
                  <input
                    value={form.customerPhone}
                    onChange={(e) => setForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="e.g. 98765 43210"
                    inputMode="tel"
                    style={fieldStyle}
                    maxLength={15}
                  />
                </div>
              </div>

              {/* Sport */}
              <div>
                <label style={labelStyle}>Sport Being Played</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {selectedVenue?.sportTypes?.map(s => {
                    const active = form.sport === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setForm(prev => ({ ...prev, sport: s })); setError(''); }}
                        style={{
                          padding: '10px 18px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                          background: active ? 'var(--primary)' : 'var(--secondary)',
                          color: active ? 'white' : 'var(--foreground)',
                          border: active ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                        }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category & players */}
              <div>
                <label style={labelStyle}>Category &amp; Players</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {['SOLO', 'TEAM', 'GROUP'].map(type => {
                    const active = form.classification === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => changeClassification(type)}
                        style={{
                          flex: 1, padding: '11px 6px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                          background: active ? 'var(--primary)' : 'var(--secondary)',
                          color: active ? 'white' : 'var(--foreground)',
                          border: active ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                        }}
                      >
                        {type[0] + type.slice(1).toLowerCase()}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {CLASS_CHOICES[form.classification].map(n => {
                    const active = form.playersCount === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPlayers(n)}
                        style={{
                          minWidth: '58px', padding: '10px 14px', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                          background: active ? 'rgba(34,197,94,0.12)' : 'var(--secondary)',
                          color: active ? 'var(--primary)' : 'var(--foreground)',
                          border: active ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                        }}
                      >
                        {n} {n === 1 ? 'player' : 'players'}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                  {form.classification === 'GROUP'
                    ? 'A group match needs a whole free turf (12 players).'
                    : `6v6 per turf · ${turfCount} turf${turfCount !== 1 ? 's' : ''} · up to ${slotCapacity} players per slot.`}
                </p>
              </div>

              {/* Slot Picker */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ ...labelStyle, marginBottom: 0 }}>Available Slots</span>
                  {fetchingAvailability && <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>Checking availability…</span>}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px', maxHeight: '230px', overflowY: 'auto', padding: '4px' }}>
                  {TIME_SLOTS.map(s => {
                    const st = slotState(s);
                    const selected = form.slot === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={st.disabled}
                        onClick={() => selectSlot(s)}
                        style={{
                          padding: '10px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: st.disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontFamily: 'inherit', textAlign: 'center',
                          background: selected ? 'var(--primary)' : st.disabled ? 'rgba(239, 68, 68, 0.05)' : 'var(--secondary)',
                          color: selected ? 'white' : st.disabled ? '#ef4444' : 'var(--foreground)',
                          border: selected ? '1px solid var(--primary)' : st.disabled ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--glass-border)',
                          opacity: st.disabled ? 0.6 : 1,
                        }}
                      >
                        {s.replace(' – ', ' > ')}
                        <div style={{ fontSize: '10px', marginTop: '3px', fontWeight: '700', opacity: 0.9 }}>
                          {st.disabled ? st.note : `${st.used}/${slotCapacity}`}
                        </div>
                        {!st.disabled && <div style={{ fontSize: '9px', marginTop: '1px', opacity: 0.75 }}>Turf {st.turf}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected slot breakdown */}
              {form.slot && selectedState && !selectedState.disabled && (
                <div style={{ background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '14px' }}>
                      <LayoutGrid size={16} color="var(--primary)" /> {form.slot}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: '600' }}>
                      {selectedStat?.total || 0}/{slotCapacity} players
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {Array.from({ length: turfCount }, (_, i) => i + 1).map(t => {
                      const ts = selectedStat?.turfs?.find(x => x.turf === t);
                      const used = ts?.total || 0;
                      const isTarget = selectedState.turf === t;
                      return (
                        <div key={t} style={{
                          flex: '1 1 120px', padding: '10px 12px', borderRadius: '10px',
                          background: isTarget ? 'rgba(34,197,94,0.12)' : 'var(--card-bg)',
                          border: isTarget ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                        }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: isTarget ? 'var(--primary)' : 'var(--muted)' }}>TURF {t}</div>
                          <div style={{ fontSize: '14px', fontWeight: '800', marginTop: '2px' }}>{used}/{TURF_CAPACITY}</div>
                          <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{isTarget ? 'this booking →' : used >= TURF_CAPACITY ? 'full' : 'free space'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '14px 18px', color: '#ef4444', fontSize: '14px', fontWeight: '500' }}>
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || fetchingAvailability}
                className="btn-primary"
                style={{ padding: '18px', borderRadius: '16px', fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(34, 197, 94, 0.2)', opacity: loading || fetchingAvailability ? 0.7 : 1, cursor: loading || fetchingAvailability ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Blocking Slot…' : <><Lock size={20} /> Confirm Offline Booking</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
