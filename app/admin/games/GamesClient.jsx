'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Gamepad2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import styles from '../admin.module.css';

const TABS = [
  { key: 'ACTIVE', label: 'Active Games' },
  { key: 'FILLING', label: 'Filling' },
  { key: 'CONFIRMED', label: 'Confirmed' },
];

const BADGE = { CONFIRMED: styles.badgeConfirmed, FILLING: styles.badgePending };

export default function GamesClient() {
  const [games, setGames] = useState([]);
  const [counts, setCounts] = useState({});
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ACTIVE');
  const [city, setCity] = useState('');
  const [venueId, setVenueId] = useState('');
  const [sport, setSport] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState('');

  const fetchGames = useCallback(async (signal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab });
      if (city) params.set('city', city);
      if (venueId) params.set('venueId', venueId);
      if (sport) params.set('sport', sport);
      if (date) params.set('date', date);
      const res = await fetch(`/api/admin/games?${params}`, { signal });
      const data = await res.json();
      setGames(data.games || []);
      setCounts(data.counts || {});
      setVenues(data.venues || []);
    } catch (e) { if (e.name !== 'AbortError') console.error(e); }
    finally { setLoading(false); }
  }, [tab, city, venueId, sport, date]);

  useEffect(() => { const c = new AbortController(); fetchGames(c.signal); return () => c.abort(); }, [fetchGames]);

  const act = async (g, action) => {
    setBusy(g.key + action);
    try {
      const res = await fetch('/api/admin/games', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: g.venueId, date: g.date, startTime: g.startTime, endTime: g.endTime, turf: g.turf, action }),
      });
      if (res.ok) fetchGames();
    } finally { setBusy(''); }
  };

  const cities = [...new Set(venues.map(v => v.city).filter(Boolean))].sort();
  const filteredVenues = city ? venues.filter(v => v.city === city) : venues;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Gamepad2 size={28} color="#22c55e" />
          <div>
            <h1 className={styles.pageTitle}>Games &amp; Matching</h1>
            <p className={styles.pageSubtitle}>Watch slots fill and confirm or cancel games.</p>
          </div>
        </div>
      </div>

      <div className={styles.tabBar}>
        {TABS.map(t => (
          <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`} onClick={() => setTab(t.key)}>
            {t.label} ({counts[t.key] ?? 0})
          </button>
        ))}
      </div>

      <div className={styles.filterBar} style={{ marginBottom: '20px', flexWrap: 'wrap' }}>
        <select className={styles.filterSelect} value={city} onChange={e => { setCity(e.target.value); setVenueId(''); }}>
          <option value="">All Cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={styles.filterSelect} value={venueId} onChange={e => setVenueId(e.target.value)}>
          <option value="">All Venues</option>
          {filteredVenues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select className={styles.filterSelect} value={sport} onChange={e => setSport(e.target.value)}>
          <option value="">All Sports</option>
          {['Box Cricket', 'Football', 'Tennis', 'Badminton', 'Basketball'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" className={styles.filterSelect} value={date} onChange={e => setDate(e.target.value)} />
        <button className={styles.pageBtn} onClick={() => fetchGames()} title="Refresh" style={{ padding: '10px 12px' }}><RefreshCw size={15} /></button>
      </div>

      <div className={styles.sectionCard}>
        {loading ? (
          <div className={styles.loadingWrap}>Loading games…</div>
        ) : games.length === 0 ? (
          <div className={styles.emptyState}><div className={styles.emptyIcon}>🎮</div>No games for this filter</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Venue</th><th>Date &amp; Time</th><th>Turf</th><th>Game</th><th>Players</th><th>Spots Left</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {games.map(g => (
                  <tr key={g.key}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--admin-text-main)' }}>{g.venueName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{g.venueCity}</div>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      <div>{new Date(g.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                      <div style={{ color: '#64748b' }}>{g.slot}</div>
                    </td>
                    <td>T{g.turf}</td>
                    <td style={{ fontSize: '12px' }}>{(g.classifications || []).join(', ')}</td>
                    <td style={{ fontWeight: 600 }}>{g.players}/{g.capacity}</td>
                    <td>{g.spotsLeft}</td>
                    <td><span className={`${styles.badge} ${BADGE[g.status] || styles.badgeUser}`}>{g.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {g.status !== 'CONFIRMED' && (
                          <button className={`${styles.iconBtn} ${styles.btnSuccess}`} disabled={busy === g.key + 'CONFIRM'} onClick={() => act(g, 'CONFIRM')} title="Force confirm"><CheckCircle2 size={14} /></button>
                        )}
                        <button className={`${styles.iconBtn} ${styles.btnDanger}`} disabled={busy === g.key + 'CANCEL'} onClick={() => act(g, 'CANCEL')} title="Cancel game"><XCircle size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
