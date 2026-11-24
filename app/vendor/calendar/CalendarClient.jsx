'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, CalendarDays, Ban, Lock, Info } from 'lucide-react';
import { istTodayISO } from '@/lib/ist';
import { STATUS_STYLES, CALENDAR_LEGEND } from '@/lib/calendarStatus';
import OfflineBookingModal from '../OfflineBookingModal';
import BlockSlotModal from './BlockSlotModal';

const LEGEND = CALENDAR_LEGEND;

function shiftDate(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function CalendarClient({ venues, initialDate, openOffline = false }) {
  const router = useRouter();
  const today = istTodayISO();
  const [venueId, setVenueId] = useState(venues[0]?.id || '');
  const [date, setDate] = useState(initialDate || today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null); // { slot, cell }
  const [showOffline, setShowOffline] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [view, setView] = useState('Day');
  const [multi, setMulti] = useState([]);
  const [multiLoading, setMultiLoading] = useState(false);
  const controllerRef = useRef(null);

  const venue = venues.find(v => v.id === venueId);

  const load = useCallback(async () => {
    if (!venueId || !date) return;
    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = new AbortController();
    setLoading(true);
    try {
      const res = await fetch(`/api/vendor/calendar?venueId=${venueId}&date=${date}`, { signal: controllerRef.current.signal });
      if (res.ok) setData(await res.json());
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    } finally {
      setLoading(false);
    }
  }, [venueId, date]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelected(null); }, [venueId, date]);
  useEffect(() => { if (openOffline) setShowOffline(true); }, [openOffline]);

  // Week / Month views fetch the day grids for the visible dates and summarise them.
  useEffect(() => {
    if (view === 'Day' || !venueId) { setMulti([]); return undefined; }
    const d = new Date(`${date}T00:00:00Z`);
    let dates = [];
    if (view === 'Week') {
      const monday = new Date(d);
      monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
      dates = Array.from({ length: 7 }, (_, i) => {
        const x = new Date(monday); x.setUTCDate(x.getUTCDate() + i);
        return x.toISOString().slice(0, 10);
      });
    } else {
      const y = d.getUTCFullYear(), m = d.getUTCMonth();
      const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      dates = Array.from({ length: last }, (_, i) => new Date(Date.UTC(y, m, i + 1)).toISOString().slice(0, 10));
    }
    let cancelled = false;
    setMultiLoading(true);
    Promise.all(dates.map(async iso => {
      const res = await fetch(`/api/vendor/calendar?venueId=${venueId}&date=${iso}`);
      return { date: iso, data: res.ok ? await res.json() : null };
    })).then((rows) => { if (!cancelled) setMulti(rows); })
      .finally(() => { if (!cancelled) setMultiLoading(false); });
    return () => { cancelled = true; };
  }, [view, date, venueId]);

  const turfs = data?.turfs?.length ? data.turfs : (venue?.turfs || []);
  const grid = data?.grid || [];

  const dateLabel = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      {showOffline && (
        <OfflineBookingModal
          venues={venues}
          initialVenueId={venueId}
          initialDate={date}
          initialSlot={selected?.slot}
          onClose={() => { setShowOffline(false); if (openOffline) router.replace('/vendor/calendar'); load(); }}
        />
      )}
      {showBlock && venue && (
        <BlockSlotModal
          venue={venue}
          turfs={turfs}
          initialDate={date}
          initialSlot={selected?.slot}
          onClose={() => setShowBlock(false)}
          onBlocked={load}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px' }}>Calendar &amp; Slots</h1>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>View availability, manage bookings and add offline bookings.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowOffline(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 18px', borderRadius: '12px', fontWeight: 600, background: 'var(--secondary)', border: '1px solid var(--glass-border)', color: 'var(--foreground)', cursor: 'pointer' }}>
              <Lock size={17} /> Add Offline Booking <span style={{ color: 'var(--primary)', fontSize: '12px' }}>(₹0)</span>
            </button>
            <button onClick={() => setShowBlock(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 18px', borderRadius: '12px', fontWeight: 600 }}>
              <Ban size={17} /> Block Slots
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={() => setDate(d => shiftDate(d, -1))} style={navBtn}><ChevronLeft size={18} /></button>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', padding: '0 6px' }}>
              <CalendarDays size={16} color="var(--primary)" /> {dateLabel}
            </span>
            <button onClick={() => setDate(d => shiftDate(d, 1))} style={navBtn}><ChevronRight size={18} /></button>
          </div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--secondary)', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '13px' }} />
          <div style={{ display: 'flex', gap: '4px', background: 'var(--secondary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            {['Day', 'Week', 'Month'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '7px 16px', borderRadius: '9px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', background: view === v ? 'var(--primary)' : 'transparent', color: view === v ? 'white' : 'var(--muted)', border: 'none' }}>{v}</button>
            ))}
          </div>
          <select value={venueId} onChange={e => setVenueId(e.target.value)} style={{ marginLeft: 'auto', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--secondary)', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '13px', cursor: 'pointer' }}>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        {/* Turf cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {turfs.map(t => (
            <div key={t.order} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: 'var(--secondary)', border: '1px solid var(--glass-border)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(22,163,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0, fontWeight: 800, fontSize: '13px' }}>
                {t.order}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                  {t.sport}{t.size?.length ? ` · ${t.size.length}×${t.size.width} ${t.size.unit}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(240px, 1fr)', gap: '20px' }} className="responsive-grid-1">
          {/* Grid */}
          {view === 'Day' ? (
          <section className="glass-morphism" style={{ padding: '18px', overflowX: 'auto' }}>
            {loading && <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '10px' }}>Loading…</div>}
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Time Slot</th>
                  {turfs.map(t => (
                    <th key={t.order} style={{ padding: '8px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map(row => (
                  <tr key={row.slot}>
                    <td style={{ padding: '10px 8px', fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: '12.5px' }}>{row.slot}</td>
                    {row.cells.map(cell => {
                      const s = STATUS_STYLES[cell.status] || STATUS_STYLES.AVAILABLE;
                      const isSel = selected?.slot === row.slot && selected?.cell?.turf === cell.turf;
                      return (
                        <td key={cell.turf}>
                          <button
                            onClick={() => setSelected({ slot: row.slot, cell })}
                            style={{
                              width: '100%', minWidth: '110px', textAlign: 'left', padding: '9px 10px', borderRadius: '10px',
                              background: s.bg, color: s.color, border: isSel ? '2px solid var(--primary)' : '1px solid transparent',
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            <div style={{ fontSize: '12px', fontWeight: 700 }}>{s.label}</div>
                            {cell.status !== 'AVAILABLE' && cell.status !== 'BLOCKED' && (
                              <div style={{ fontSize: '10.5px', opacity: 0.85 }}>{cell.players}/{cell.capacity}</div>
                            )}
                            {cell.detail && cell.status === 'OFFLINE' && (
                              <div style={{ fontSize: '10.5px', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cell.detail}</div>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!grid.length && !loading && (
                  <tr><td colSpan={turfs.length + 1} style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>No slots for this date.</td></tr>
                )}
              </tbody>
            </table>
          </section>
          ) : (
          <section className="glass-morphism" style={{ padding: '18px', overflowX: 'auto' }}>
            {multiLoading && <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '10px' }}>Loading…</div>}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Time Slot</th>
                  {multi.map(m => (
                    <th key={m.date} style={{ padding: '8px', color: 'var(--muted)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {new Date(`${m.date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {((multi[0]?.data?.grid) || []).map((row, i) => (
                  <tr key={row.slot} style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '8px', whiteSpace: 'nowrap', color: 'var(--muted)' }}>{row.slot}</td>
                    {multi.map(m => {
                      const r = m.data?.grid?.[i];
                      const booked = r?.cells?.filter(c => c.status !== 'AVAILABLE' && c.status !== 'BLOCKED' && c.status !== 'TOURNAMENT').length || 0;
                      const blocked = r?.cells?.filter(c => c.status === 'BLOCKED' || c.status === 'TOURNAMENT').length || 0;
                      return (
                        <td key={m.date} style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {booked ? `${booked} booked` : '—'}{blocked ? ` · ${blocked} blocked` : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          )}

          {/* Side panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <section className="glass-morphism" style={{ padding: '18px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Slot Details</h3>
              {selected ? (
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontWeight: 700 }}>{selected.slot}</div>
                  <div style={{ color: 'var(--muted)' }}>Turf {selected.cell.turf}</div>
                  <div style={{ color: STATUS_STYLES[selected.cell.status]?.color, fontWeight: 700 }}>{STATUS_STYLES[selected.cell.status]?.label}</div>
                  {selected.cell.status !== 'AVAILABLE' && selected.cell.status !== 'BLOCKED' && (
                    <div>{selected.cell.players}/{selected.cell.capacity} players</div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Select any slot to view booking details and status.</p>
              )}
            </section>

            <section className="glass-morphism" style={{ padding: '18px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Info size={14} /> Slot Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {LEGEND.map(k => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: STATUS_STYLES[k].bg, border: `1px solid ${STATUS_STYLES[k].color}55`, flexShrink: 0 }} />
                    <span style={{ color: 'var(--muted)' }}>{STATUS_STYLES[k].label}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

const navBtn = {
  width: '34px', height: '34px', borderRadius: '9px', border: '1px solid var(--glass-border)',
  background: 'var(--secondary)', color: 'var(--foreground)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
