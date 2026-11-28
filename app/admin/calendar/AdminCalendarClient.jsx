'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/clientApi';
import { CalendarDays, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { istTodayISO, addDaysISO, formatBookingDate } from '@/lib/ist';
import { STATUS_STYLES, CALENDAR_LEGEND } from '@/lib/calendarStatus';
import styles from '../admin.module.css';

export default function AdminCalendarClient() {
  const todayISO = istTodayISO();
  const [date, setDate] = useState(todayISO);
  const [venueId, setVenueId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (signal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (venueId) params.set('venueId', venueId);
      const res = await apiFetch(`/api/admin/calendar?${params}`, { signal });
      const d = await res.json();
      setData(d);
      if (!venueId && d.venue) setVenueId(d.venue.id);
    } catch (e) { if (e.name !== 'AbortError') console.error(e); }
    finally { setLoading(false); }
  }, [date, venueId]);

  useEffect(() => { const c = new AbortController(); load(c.signal); return () => c.abort(); }, [load]);

  const turfs = data?.turfs || [];
  const grid = data?.grid || [];
  const dateLabel = formatBookingDate(`${date}T00:00:00Z`, { weekday: true });

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CalendarDays size={28} color="#22c55e" />
          <div>
            <h1 className={styles.pageTitle}>Calendar (All Venues)</h1>
            <p className={styles.pageSubtitle}>Availability and bookings across the platform.</p>
          </div>
        </div>
      </div>

      <div className={styles.filterBar} style={{ marginBottom: '20px', flexWrap: 'wrap' }}>
        <button className={styles.pageBtn} onClick={() => setDate(d => addDaysISO(d, -1))} style={{ padding: '10px 12px' }}><ChevronLeft size={16} /></button>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px' }}><CalendarDays size={15} color="#22c55e" /> {dateLabel}</span>
        <button className={styles.pageBtn} onClick={() => setDate(d => addDaysISO(d, 1))} style={{ padding: '10px 12px' }}><ChevronRight size={16} /></button>
        <input type="date" className={styles.filterSelect} value={date} onChange={e => setDate(e.target.value)} />
        <select className={styles.filterSelect} value={venueId} onChange={e => setVenueId(e.target.value)} style={{ marginLeft: 'auto' }}>
          {(data?.venues || []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      <div className={styles.sectionCard}>
        {loading ? (
          <div className={styles.loadingWrap}>Loading calendar…</div>
        ) : !data?.venue ? (
          <div className={styles.emptyState}>No venue selected.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time Slot</th>
                  {turfs.map(t => <th key={t.order}>{t.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {grid.map(row => (
                  <tr key={row.slot}>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{row.slot}</td>
                    {row.cells.map(cell => {
                      const s = STATUS_STYLES[cell.status] || STATUS_STYLES.AVAILABLE;
                      return (
                        <td key={cell.turf}>
                          <div style={{ background: s.bg, color: s.color, borderRadius: '8px', padding: '6px 8px', fontSize: '11px', fontWeight: 700 }}>
                            {s.label}
                            {cell.status !== 'AVAILABLE' && cell.status !== 'BLOCKED' && <span style={{ fontWeight: 400, marginLeft: '4px' }}>{cell.players}/{cell.capacity}</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Info size={15} /> Slot Status</h2>
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
          {CALENDAR_LEGEND.map(k => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
              <span style={{ width: '13px', height: '13px', borderRadius: '4px', background: STATUS_STYLES[k].bg, border: `1px solid ${STATUS_STYLES[k].color}55` }} />
              {STATUS_STYLES[k].label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
