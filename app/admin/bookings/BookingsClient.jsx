'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  CalendarCheck, RefreshCw, CheckCircle2, XCircle, 
  Info, ArrowDownCircle, User, MessageSquare, ShieldCheck, X, Search, Filter
} from 'lucide-react';
import styles from '../admin.module.css';

const STATUS_TABS = ['All', 'PENDING', 'CONFIRMED', 'CANCELLED'];

const STATUS_BADGE = {
  CONFIRMED: styles.badgeConfirmed,
  PENDING: styles.badgePending,
  CANCELLED: styles.badgeCancelled,
  PAYMENT_PENDING: styles.badgePaymentPending,
};

export default function BookingsClient() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // New filters
  const [venueFilter, setVenueFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [venues, setVenues] = useState([]);
  const [cities, setCities] = useState([]);

  // Admin cancellation state removed

  // Fetch venue/city lists for filter dropdowns
  useEffect(() => {
    fetch('/api/admin/venues?limit=200').then(r => r.json()).then(d => {
      const v = d.venues || [];
      setVenues(v);
      const uniqueCities = [...new Set(v.map(x => x.city).filter(Boolean))];
      setCities(uniqueCities.sort());
    }).catch(() => {});
  }, []);

  const fetchBookings = useCallback(async (signal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (activeTab !== 'All') params.set('status', activeTab);
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
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, dateFrom, dateTo, venueFilter, cityFilter, typeFilter, classFilter, searchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    fetchBookings(controller.signal);
    return () => controller.abort();
  }, [fetchBookings]);

  return (
    <div>

      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CalendarCheck size={28} color="#22c55e" />
          <div>
            <h1 className={styles.pageTitle}>Bookings</h1>
            <p className={styles.pageSubtitle}>{total} total bookings on the platform</p>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className={styles.tabBar}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => { setActiveTab(tab); setPage(1); }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className={styles.filterBar} style={{ marginBottom: '12px', flexWrap: 'wrap' }}>
        <input
          type="date"
          className={styles.filterSelect}
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          title="From date"
        />
        <input
          type="date"
          className={styles.filterSelect}
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          title="To date"
        />
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
          <input
            type="text"
            placeholder="Search customer name, email, phone..."
            className={styles.filterSelect}
            style={{ paddingLeft: '34px', width: '100%' }}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>
        {(dateFrom || dateTo || venueFilter || cityFilter || typeFilter || classFilter || searchQuery) && (
          <button
            className={styles.pageBtn}
            onClick={() => { setDateFrom(''); setDateTo(''); setVenueFilter(''); setCityFilter(''); setTypeFilter(''); setClassFilter(''); setSearchQuery(''); setPage(1); }}
          >
            Clear All
          </button>
        )}
        <button className={styles.pageBtn} onClick={() => fetchBookings()} title="Refresh" style={{ padding: '10px 12px' }}>
          <RefreshCw size={15} />
        </button>
      </div>

      <div className={styles.sectionCard}>
        {loading ? (
          <div className={styles.loadingWrap}>Loading bookings…</div>
        ) : bookings.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            No bookings found for this filter
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Venue</th>
                    <th>Date / Slot</th>
                    <th>Mode</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Refund / Cancellation</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const isCancelled = b.status === 'CANCELLED';
                    return (
                      <tr key={b.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className={styles.userAvatar}>
                              {b.userName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--admin-text-main)', fontSize: '13px' }}>{b.userName}</div>
                              {b.userEmail && (
                                <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{b.userEmail}</div>
                              )}
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
                        <td>
                          <span className={`${styles.badge} ${b.bookingType === 'ONLINE' ? styles.badgeOnline : styles.badgeOffline}`}>
                            {b.bookingType}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--admin-text-main)', fontSize: '13px' }}>
                          ₹{b.amount}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${STATUS_BADGE[b.status] || styles.badgeUser}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          {isCancelled && b.cancelledBy ? (
                            <div style={{ fontSize: '11px', minWidth: '140px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171', fontWeight: '600', marginBottom: '2px' }}>
                                <XCircle size={10} /> By {b.cancelledBy}
                              </div>
                              {b.refundAmount > 0 && (
                                <div style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <ShieldCheck size={10} /> ₹{b.refundAmount} ({b.refundPercent}%)
                                </div>
                              )}
                              {b.cancellationReason && (
                                <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px', fontStyle: 'italic' }}>
                                  "{b.cancellationReason.length > 30 ? b.cancellationReason.substring(0, 30) + '...' : b.cancellationReason}"
                                </div>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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
