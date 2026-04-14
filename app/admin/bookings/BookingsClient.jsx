'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import styles from '../admin.module.css';

const STATUS_TABS = ['All', 'PENDING', 'CONFIRMED', 'CANCELLED'];

const STATUS_BADGE = {
  CONFIRMED: styles.badgeConfirmed,
  PENDING: styles.badgePending,
  CANCELLED: styles.badgeCancelled,
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
  const [updatingId, setUpdatingId] = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (activeTab !== 'All') params.set('status', activeTab);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/admin/bookings?${params}`);
      const data = await res.json();
      setBookings(data.bookings || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, activeTab, dateFrom, dateTo]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleStatusChange = async (bookingId, newStatus) => {
    setUpdatingId(bookingId);
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status: newStatus }),
      });
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => b.id === bookingId ? { ...b, status: newStatus } : b)
        );
      }
    } catch (e) { console.error(e); }
    finally { setUpdatingId(null); }
  };

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

      {/* Date Filters */}
      <div className={styles.filterBar} style={{ marginBottom: '20px' }}>
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
        {(dateFrom || dateTo) && (
          <button
            className={styles.pageBtn}
            onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
          >
            Clear
          </button>
        )}
        <button className={styles.pageBtn} onClick={fetchBookings} title="Refresh" style={{ padding: '10px 12px' }}>
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
                    <th>Date</th>
                    <th>Slot</th>
                    <th>Category</th>
                    <th>Mode</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const isUpdating = updatingId === b.id;
                    return (
                      <tr key={b.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className={styles.userAvatar}>
                              {b.userName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '13px' }}>{b.userName}</div>
                              {b.userEmail && (
                                <div style={{ fontSize: '11px', color: '#64748b' }}>{b.userEmail}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: '13px' }}>{b.venueName}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{b.venueCity}</div>
                        </td>
                        <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{b.dateStr}</td>
                        <td style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{b.slot}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', textTransform: 'uppercase' }}>
                              {b.classification}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>({b.playersCount}p)</span>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${b.bookingType === 'ONLINE' ? styles.badgeOnline : styles.badgeOffline}`}>
                            {b.bookingType}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#22c55e', fontSize: '13px' }}>
                          ₹{b.amount}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${STATUS_BADGE[b.status] || styles.badgeUser}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {b.status !== 'CONFIRMED' && (
                              <button
                                className={`${styles.iconBtn} ${styles.btnSuccess}`}
                                disabled={isUpdating}
                                onClick={() => handleStatusChange(b.id, 'CONFIRMED')}
                                title="Confirm booking"
                              >
                                {isUpdating ? '…' : <CheckCircle2 size={14} />}
                              </button>
                            )}
                            {b.status !== 'CANCELLED' && (
                              <button
                                className={`${styles.iconBtn} ${styles.btnDanger}`}
                                disabled={isUpdating}
                                onClick={() => handleStatusChange(b.id, 'CANCELLED')}
                                title="Cancel booking"
                              >
                                {isUpdating ? '…' : <XCircle size={14} />}
                              </button>
                            )}
                          </div>
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
