'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CalendarCheck, RefreshCw, XCircle, ShieldCheck, Search, Download,
} from 'lucide-react';
import styles from '../admin.module.css';

const TABS = [
  { key: 'ALL', label: 'All Bookings' },
  { key: 'UPCOMING', label: 'Upcoming' },
  { key: 'ACTIVE', label: 'Active / In-Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_BADGE = {
  CONFIRMED: styles.badgeConfirmed,
  PENDING: styles.badgePending,
  CANCELLED: styles.badgeCancelled,
  PAYMENT_PENDING: styles.badgePaymentPending,
};

export default function BookingsClient() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const statusParam = searchParams.get('status') || '';
  const [tab, setTab] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [venueFilter, setVenueFilter] = useState(searchParams.get('venueId') || '');
  const [cityFilter, setCityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [venues, setVenues] = useState([]);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    fetch('/api/admin/venues?limit=200').then(r => r.json()).then(d => {
      const v = d.venues || [];
      setVenues(v);
      setCities([...new Set(v.map(x => x.city).filter(Boolean))].sort());
    }).catch(() => {});
  }, []);

  const fetchBookings = useCallback(async (signal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (tab !== 'ALL') params.set('tab', tab);
      if (statusParam) params.set('status', statusParam);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (venueFilter) params.set('venueId', venueFilter);
      if (cityFilter) params.set('city', cityFilter);
      if (typeFilter) params.set('bookingType', typeFilter);
      if (classFilter) params.set('classification', classFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const res = await fetch(`/api/admin/bookings?${params}`, { signal });
      const data = await res.json();
      setBookings(data.bookings || []);
      setCounts(data.counts || {});
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, tab, statusParam, dateFrom, dateTo, venueFilter, cityFilter, typeFilter, classFilter, searchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    fetchBookings(controller.signal);
    return () => controller.abort();
  }, [fetchBookings]);

  const exportCsv = () => {
    const header = 'Booking ID,Customer,Venue,Date,Slot,Turf,Sport,Team,Amount,Status\n';
    const body = bookings.map(b => [b.ref, b.userName, b.venueName, b.dateStr, b.slot, `T${b.turf}`, b.sport, `${b.playersCount} ${b.classification}`, b.amount, b.status].map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bookings.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CalendarCheck size={28} color="#22c55e" />
          <div>
            <h1 className={styles.pageTitle}>Bookings</h1>
            <p className={styles.pageSubtitle}>{total} bookings for the current filter</p>
          </div>
        </div>
      </div>

      <div className={styles.tabBar}>
        {TABS.map((t) => (
          <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`} onClick={() => { setTab(t.key); setPage(1); }}>
            {t.label} ({counts[t.key] ?? 0})
          </button>
        ))}
      </div>

      <div className={styles.filterBar} style={{ marginBottom: '12px', flexWrap: 'wrap' }}>
        <input type="date" className={styles.filterSelect} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} title="From date" />
        <input type="date" className={styles.filterSelect} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} title="To date" />
        <select className={styles.filterSelect} value={venueFilter} onChange={(e) => { setVenueFilter(e.target.value); setPage(1); }}>
          <option value="">All Venues</option>
          {venues.map(v => <option key={v.id || v._id} value={v.id || v._id}>{v.name}</option>)}
        </select>
        <select className={styles.filterSelect} value={cityFilter} onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}>
          <option value="">All Cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={styles.filterSelect} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="ONLINE">Online</option>
          <option value="OFFLINE">Offline</option>
        </select>
        <select className={styles.filterSelect} value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}>
          <option value="">All Classes</option>
          <option value="SOLO">Solo</option>
          <option value="TEAM">Team</option>
          <option value="GROUP">Group</option>
        </select>
      </div>
      <div className={styles.filterBar} style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input type="text" placeholder="Search customer name, email, phone..." className={styles.filterSelect} style={{ paddingLeft: '34px', width: '100%' }} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
        </div>
        {(dateFrom || dateTo || venueFilter || cityFilter || typeFilter || classFilter || searchQuery) && (
          <button className={styles.pageBtn} onClick={() => { setDateFrom(''); setDateTo(''); setVenueFilter(''); setCityFilter(''); setTypeFilter(''); setClassFilter(''); setSearchQuery(''); setPage(1); }}>Clear All</button>
        )}
        <button className={styles.pageBtn} onClick={() => fetchBookings()} title="Refresh" style={{ padding: '10px 12px' }}><RefreshCw size={15} /></button>
        <button className={styles.pageBtn} onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px' }}><Download size={15} /> Export</button>
      </div>

      <div className={styles.sectionCard}>
        {loading ? (
          <div className={styles.loadingWrap}>Loading bookings…</div>
        ) : bookings.length === 0 ? (
          <div className={styles.emptyState}><div className={styles.emptyIcon}>📋</div>No bookings found for this filter</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Booking ID</th><th>Customer</th><th>Venue</th><th>Date &amp; Time</th><th>Turf</th><th>Sport</th><th>Team</th><th>Amount</th><th>Status</th><th>Refund</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const isCancelled = b.status === 'CANCELLED';
                    return (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 600, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{b.ref}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className={styles.userAvatar}>{b.userName?.charAt(0)?.toUpperCase() || '?'}</div>
                            <div>
                              {b.userId ? (
                                <Link href={`/admin/users/${b.userId}`} style={{ fontWeight: 600, color: 'var(--admin-text-main)', fontSize: '13px', textDecoration: 'none' }}>{b.userName}</Link>
                              ) : <div style={{ fontWeight: 600, color: 'var(--admin-text-main)', fontSize: '13px' }}>{b.userName}</div>}
                              {b.userEmail && <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{b.userEmail}</div>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--admin-text-main)', fontSize: '13px' }}>{b.venueName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{b.venueCity}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', whiteSpace: 'nowrap', color: 'var(--admin-text-main)' }}>{b.dateStr}</div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>{b.slot}</div>
                        </td>
                        <td style={{ fontSize: '12px' }}>T{b.turf}</td>
                        <td style={{ fontSize: '12px' }}>{b.sport || '—'}</td>
                        <td style={{ fontSize: '12px' }}>{b.playersCount} {b.classification}</td>
                        <td style={{ fontWeight: 700, color: 'var(--admin-text-main)', fontSize: '13px' }}>₹{b.amount}</td>
                        <td><span className={`${styles.badge} ${STATUS_BADGE[b.status] || styles.badgeUser}`}>{b.status}</span></td>
                        <td>
                          {isCancelled && b.cancelledBy ? (
                            <div style={{ fontSize: '11px', minWidth: '140px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171', fontWeight: 600, marginBottom: '2px' }}>
                                <XCircle size={10} /> By {b.cancelledBy}
                              </div>
                              {b.refundAmount > 0 && (
                                <div style={{ color: b.refundStatus === 'COMPLETED' ? '#22c55e' : b.refundStatus === 'FAILED' ? '#f87171' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <ShieldCheck size={10} />
                                  {b.refundStatus === 'COMPLETED' && `₹${b.refundAmount} refunded`}
                                  {b.refundStatus === 'FAILED' && `₹${b.refundAmount} refund FAILED`}
                                  {(b.refundStatus === 'PENDING' || b.refundStatus === 'NONE') && `₹${b.refundAmount} refund pending`}
                                </div>
                              )}
                            </div>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
              <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
