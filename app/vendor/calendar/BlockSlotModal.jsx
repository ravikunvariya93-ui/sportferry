'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import { X, AlertCircle, Ban } from 'lucide-react';
import { SLOT_LABELS, istTodayISO, isSlotLabelPast } from '@/lib/ist';

const REASONS = [
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'PRIVATE', label: 'Private Use' },
  { value: 'TOURNAMENT', label: 'Tournament' },
];

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' };
const fieldStyle = { width: '100%', padding: '13px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px' };

export default function BlockSlotModal({ venue, turfs, initialDate, initialSlot, onClose, onBlocked }) {
  const today = istTodayISO();
  const [form, setForm] = useState({
    date: initialDate || today,
    turf: turfs[0]?.order || 1,
    slot: initialSlot || '',
    reason: 'MAINTENANCE',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const availableSlots = SLOT_LABELS.filter(s => form.date > today || !isSlotLabelPast(s, form.date));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.slot) { setError('Pick a slot to block.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/vendor/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: venue.id, turf: Number(form.turf), date: form.date, slot: form.slot, reason: form.reason, note: form.note }),
      });
      const data = await res.json();
      if (res.ok) {
        onBlocked?.();
        onClose();
      } else {
        setError(data.message || 'Could not block the slot.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-morphism" style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '22px 26px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Block Slot</h2>
          <button onClick={onClose} style={{ background: 'var(--secondary)', border: '1px solid var(--glass-border)', height: '38px', width: '38px', borderRadius: '10px', cursor: 'pointer', color: 'var(--foreground)' }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '26px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={form.date} min={today} onChange={e => setForm(p => ({ ...p, date: e.target.value, slot: '' }))} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Turf</label>
              <select value={form.turf} onChange={e => setForm(p => ({ ...p, turf: Number(e.target.value) }))} style={{ ...fieldStyle, cursor: 'pointer' }}>
                {turfs.map(t => <option key={t.order} value={t.order}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Time Slot</label>
            <select value={form.slot} onChange={e => setForm(p => ({ ...p, slot: e.target.value }))} style={{ ...fieldStyle, cursor: 'pointer' }}>
              <option value="">Select a slot…</option>
              {availableSlots.map(s => <option key={s} value={s}>{s.replace(' \u2013 ', ' – ')}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Reason</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {REASONS.map(r => {
                const active = form.reason === r.value;
                return (
                  <button key={r.value} type="button" onClick={() => setForm(p => ({ ...p, reason: r.value }))} style={{
                    padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    background: active ? 'var(--primary)' : 'var(--secondary)', color: active ? 'white' : 'var(--foreground)',
                    border: active ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                  }}>{r.label}</button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Note (optional)</label>
            <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} maxLength={200} placeholder="e.g. Floodlight repair" style={fieldStyle} />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '12px 16px', color: '#dc2626', fontSize: '13px' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '15px', borderRadius: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.7 : 1 }}>
            <Ban size={18} /> {loading ? 'Blocking…' : 'Block Slot'}
          </button>
        </form>
      </div>
    </div>
  );
}
