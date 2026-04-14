'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Clock, PlayCircle, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

const TIME_SLOTS = [
  '06:00 AM – 07:00 AM', '07:00 AM – 08:00 AM', '08:00 AM – 09:00 AM', '09:00 AM – 10:00 AM',
  '10:00 AM – 11:00 AM', '11:00 AM – 12:00 PM', '12:00 PM – 01:00 PM', '01:00 PM – 02:00 PM',
  '02:00 PM – 03:00 PM', '03:00 PM – 04:00 PM', '04:00 PM – 05:00 PM', '05:00 PM – 06:00 PM',
  '06:00 PM – 07:00 PM', '07:00 PM – 08:00 PM', '08:00 PM – 09:00 PM', '09:00 PM – 10:00 PM',
  '10:00 PM – 11:00 PM', '11:00 PM – 12:00 AM'
];

export default function OfflineBookingModal({ venues, onClose }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingAvailability, setFetchingAvailability] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    venueId: venues[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    slot: '',
    sport: '',
    classification: 'SOLO',
    playersCount: 1,
  });

  const [busySlots, setBusySlots] = useState([]);
  const selectedVenue = venues.find(v => v.id === form.venueId);

  // Set default sport when venue changes
  useEffect(() => {
    if (selectedVenue?.sportTypes?.length > 0 && !form.sport) {
      setForm(prev => ({ ...prev, sport: selectedVenue.sportTypes[0] }));
    }
  }, [selectedVenue, form.sport]);

  const fetchAvailability = useCallback(async () => {
    if (!form.venueId || !form.date) return;
    setFetchingAvailability(true);
    try {
      const res = await fetch(`/api/venues/${form.venueId}/availability?date=${form.date}`);
      const data = await res.json();
      setBusySlots(data.busySlots || []);
    } catch (e) {
      console.error('Failed to fetch availability', e);
    } finally {
      setFetchingAvailability(false);
    }
  }, [form.venueId, form.date]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.slot) {
      setError('Please select a time slot.');
      return;
    }
    if (!form.sport) {
      setError('Please select a sport.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          bookingType: 'OFFLINE',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { onClose(); router.refresh(); }, 1800);
      } else {
        setError(data.message || 'Failed to block slot.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toSlotLabel = (s) => {
    // API uses 24h: "18:00 – 19:00"
    // UI uses 12h: "06:00 PM – 07:00 PM"
    // We need to normalize or match. 
    // Let's assume the API returns what we need or we convert.
    // Actually, the API returns b.startTime – b.endTime from model which are "HH:mm".
    return s; 
  };

  const isSlotBusy = (slotLabel) => {
    const [start, end] = slotLabel.split(' – ').map(s => {
      let [time, meridiem] = s.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (meridiem === 'PM' && h !== 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    });
    const key = `${start} – ${end}`;
    return busySlots.includes(key);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-morphism" style={{ width: '100%', maxWidth: '640px', maxHeight: '95vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 10 }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px' }}>Offline Booking</h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '2px' }}>Manually block slots for walk-in players</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--secondary)', border: '1px solid var(--glass-border)', height: '40px', width: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--foreground)' }}>
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: '80px 32px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle2 size={32} color="#16a34a" />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Slot Blocked!</h3>
            <p style={{ color: 'var(--muted)' }}>The offline booking has been successfully recorded.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Venue & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Venue</label>
                  <div style={{ position: 'relative' }}>
                    <select 
                      value={form.venueId} 
                      onChange={(e) => setForm({...form, venueId: e.target.value})}
                      style={{ width: '100%', padding: '14px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'var(--foreground)', appearance: 'none', outline: 'none', cursor: 'pointer' }}
                    >
                      {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</label>
                  <input 
                    type="date" 
                    value={form.date} 
                    onChange={(e) => setForm({...form, date: e.target.value})}
                    style={{ width: '100%', padding: '14px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '14px', color: 'var(--foreground)', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Sport & Classification */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sport Being Played</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {selectedVenue?.sportTypes?.map(s => {
                      const active = form.sport === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setForm({ ...form, sport: s })}
                          style={{
                            padding: '10px 18px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
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
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category & Players</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px', flex: 2 }}>
                      {['SOLO', 'TEAM', 'GROUP'].map(type => {
                        const active = form.classification === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setForm({ ...form, classification: type })}
                            style={{
                              flex: 1, padding: '10px 4px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                              background: active ? 'var(--primary)' : 'var(--secondary)',
                              color: active ? 'white' : 'var(--foreground)',
                              border: active ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                            }}
                          >
                            {type.slice(0,1)}
                          </button>
                        );
                      })}
                    </div>
                    <input 
                      type="number"
                      min="1"
                      value={form.playersCount}
                      onChange={(e) => setForm({...form, playersCount: parseInt(e.target.value) || 1})}
                      style={{ 
                        flex: 1, padding: '10px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--foreground)', outline: 'none', textAlign: 'center', fontSize: '14px', fontWeight: '700'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Slot Picker */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available Slots</span>
                  {fetchingAvailability && <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>Checking availability...</span>}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                  {TIME_SLOTS.map(s => {
                    const busy = isSlotBusy(s);
                    const selected = form.slot === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={busy}
                        onClick={() => setForm({ ...form, slot: s })}
                        style={{
                          padding: '12px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: busy ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                          background: selected ? 'var(--primary)' : busy ? 'rgba(239, 68, 68, 0.05)' : 'var(--secondary)',
                          color: selected ? 'white' : busy ? '#ef4444' : 'var(--foreground)',
                          border: selected ? '1px solid var(--primary)' : busy ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--glass-border)',
                          opacity: busy ? 0.6 : 1,
                          textAlign: 'center'
                        }}
                      >
                        {s.replace(' – ', ' > ')}
                        {busy && <div style={{ fontSize: '9px', marginTop: '2px', fontWeight: '700' }}>BOOKED</div>}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                style={{ padding: '18px', borderRadius: '16px', fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(34, 197, 94, 0.2)' }}
              >
                {loading ? 'Blocking Slot...' : <><Lock size={20} /> Confirm Offline Booking</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
