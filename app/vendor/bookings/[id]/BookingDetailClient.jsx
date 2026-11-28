'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/clientApi';
import { formatINR } from '@/lib/format';
import Link from 'next/link';
import { ArrowLeft, Trophy, MapPin, Clock, Users, IndianRupee, CheckCircle2, RefreshCw } from 'lucide-react';

const BADGE = { CONFIRMED: '#16a34a', PENDING: '#d97706', CANCELLED: '#dc2626', PAYMENT_PENDING: '#3b82f6' };

export default function BookingDetailClient({ bookingId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/vendor/bookings/${bookingId}`);
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  const checkin = async () => {
    setMessage('');
    const res = await apiFetch('/api/vendor/verify-booking', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: bookingId, action: 'checkin' }),
    });
    const d = await res.json();
    setMessage(d.message || 'Could not check in.');
    if (d.ok) load();
  };

  if (loading) return <div style={{ color: 'var(--muted)', padding: '24px' }}>Loading booking…</div>;
  if (!data) return <div style={{ color: 'var(--muted)', padding: '24px' }}>Booking not found.</div>;

  const b = data.booking;
  const slotFmt = (t) => {
    const [h, m] = String(t).split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Link href="/vendor/bookings" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '13px', textDecoration: 'none' }}>
        <ArrowLeft size={15} /> All Bookings
      </Link>

      <header>
        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.5px' }}>Booking Details</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Booking ID: {b.ref}</p>
      </header>

      <div className="glass-morphism responsive-grid-1" style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(220px,1fr)', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={20} color="var(--primary)" />
            <div>
              <div style={{ fontWeight: 700 }}>{b.sport} ({b.classification})</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{b.venue} · {b.place}</div>
            </div>
            <span style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, background: `${BADGE[b.status] || '#64748b'}1f`, color: BADGE[b.status] || '#64748b' }}>{b.status}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: '12px' }}>
            {[
              [Clock, 'Date & time', `${b.date} · ${slotFmt(b.startTime)} – ${slotFmt(b.endTime)}`],
              [MapPin, 'Turf', `Turf ${b.turf}`],
              [Users, 'Players', `${b.playersCount}`],
              [IndianRupee, 'Amount', formatINR(b.amount)],
            ].map(([Icon, label, value]) => (
              <div key={label} style={{ padding: '12px', background: 'var(--secondary)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <Icon size={15} color="var(--primary)" />
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>{label}</div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>

          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>Players ({data.roster.length})</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {data.roster.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '100px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', fontSize: '13px' }}>
                  <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>{p.name.charAt(0).toUpperCase()}</span>
                  {p.name} · {p.playersCount}
                  {p.checkedIn && <CheckCircle2 size={13} color="#16a34a" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '18px', background: 'var(--secondary)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Your commission ({b.commissionPercent}%)</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>{formatINR(b.commissionAmount)}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px' }}>Customer: {b.customerName}</div>
          </div>

          <button onClick={checkin} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', fontWeight: 700 }} disabled={Boolean(b.checkedInAt)}>
            <CheckCircle2 size={17} /> {b.checkedInAt ? 'Checked In' : 'Check-in & Play'}
          </button>
          {message && <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>{message}</div>}

          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Booking Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.timeline.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.done ? 'var(--primary)' : 'var(--glass-border)', marginTop: '4px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{t.label}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>{t.at ? new Date(t.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
