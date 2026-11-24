'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Gamepad2, RefreshCw, Users, ShieldCheck } from 'lucide-react';
import { IST_OFFSET_MS } from '@/lib/ist';

const TABS = [
  { key: 'FILLING', label: 'Filling' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'ACTIVE', label: 'Today' },
];

export default function GamesClient() {
  const todayISO = new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
  const [date, setDate] = useState(todayISO);
  const [tab, setTab] = useState('FILLING');
  const tabTouched = useRef(false);
  const selectTab = (next) => { tabTouched.current = true; setTab(next); };
  const [data, setData] = useState({ games: [], counts: {} });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (signal) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendor/games?date=${date}`, { signal });
      if (res.ok) setData(await res.json());
    } catch (e) { if (e.name !== 'AbortError') console.error(e); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { const c = new AbortController(); load(c.signal); return () => c.abort(); }, [load]);

  useEffect(() => {
    if (tabTouched.current || loading || tab !== 'FILLING') return;
    if (!data.games.some(g => g.status === 'FILLING') && (data.counts?.CONFIRMED || 0) > 0) setTab('CONFIRMED');
  }, [data, loading, tab]);

  const rows = data.games.filter((g) => {
    if (tab === 'CONFIRMED') return g.status === 'CONFIRMED';
    if (tab === 'ACTIVE') return g.active;
    return g.status === 'FILLING';
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.5px' }}>Game Status</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>See how each game is filling up in real time.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--secondary)', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '13px' }} />
          <button onClick={() => load()} style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--secondary)', color: 'var(--foreground)', cursor: 'pointer' }} title="Refresh"><RefreshCw size={15} /></button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => selectTab(t.key)} style={{ padding: '9px 18px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: tab === t.key ? 'var(--primary)' : 'var(--secondary)', color: tab === t.key ? 'white' : 'var(--foreground)', border: `1px solid ${tab === t.key ? 'var(--primary)' : 'var(--glass-border)'}` }}>
            {t.label} ({data.counts?.[t.key] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', padding: '24px' }}>Loading games…</div>
      ) : rows.length === 0 ? (
        <div className="glass-morphism" style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>No games for this view.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {rows.map(g => (
            <div key={g.key} className="glass-morphism" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontWeight: 700 }}>{g.slot} · T{g.turf}</div>
                <span style={{ padding: '2px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, background: g.status === 'CONFIRMED' ? 'rgba(22,163,74,0.12)' : 'rgba(251,191,36,0.16)', color: g.status === 'CONFIRMED' ? 'var(--primary)' : '#b45309' }}>
                  {g.status}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>{g.venueName} · {g.date}</div>

              <div style={{ margin: '14px 0 8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} /> Players joined: {g.players} / {g.capacity}</span>
                <span style={{ color: g.spotsLeft ? '#d97706' : 'var(--primary)' }}>{g.spotsLeft ? `${g.spotsLeft} spots left!` : 'Full'}</span>
              </div>
              <div style={{ height: '8px', borderRadius: '100px', background: 'var(--glass-bg)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (g.players / g.capacity) * 100)}%`, background: 'var(--primary)' }} />
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: '14px', flexWrap: 'wrap' }}>
                {g.roster.map((p, i) => (
                  <div key={i} title={`${p.name} · ${p.playersCount} (${p.classification})`} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(22,163,74,0.14)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {Array.from({ length: Math.min(g.spotsLeft, 2) }, (_, i) => (
                  <div key={`e${i}`} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '16px' }}>+</div>
                ))}
              </div>

              {g.reason && <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', color: '#3b82f6', fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}><ShieldCheck size={14} /> {g.reason}</div>}

              <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(22,163,74,0.08)', color: 'var(--primary)', fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <Gamepad2 size={14} /> Slot held: {g.status === 'CONFIRMED' ? 'Confirmed' : 'Held for players'} — the slot will not be shown as available to others.
              </div>

              <Link href={`/vendor/bookings?slot=${encodeURIComponent(g.slot)}`} style={{ display: 'inline-block', marginTop: '12px', fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>View bookings →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
