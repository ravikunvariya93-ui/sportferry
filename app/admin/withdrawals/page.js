'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, RefreshCw, CheckCircle2, XCircle, Clock, X } from 'lucide-react';
import styles from '../admin.module.css';

const STATUS_TABS = ['All', 'PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED'];

const STATUS_BADGE = {
  PENDING: styles.badgePending,
  PROCESSING: styles.badgePending,
  COMPLETED: styles.badgeConfirmed,
  REJECTED: styles.badgeCancelled,
};

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchData = useCallback(async (signal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (activeTab !== 'All') params.set('status', activeTab);
      const res = await fetch(`/api/admin/withdrawals?${params}`, { signal });
      const data = await res.json();
      setWithdrawals(data.withdrawals || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e) {
      if (e.name === 'AbortError') return;
    } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleAction = async (id, status) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: id, status }),
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
    finally { setUpdatingId(null); }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Wallet size={28} color="#8b5cf6" />
          <div>
            <h1 className={styles.pageTitle}>Withdrawals</h1>
            <p className={styles.pageSubtitle}>{total} withdrawal requests</p>
          </div>
        </div>
      </div>

      <div className={styles.tabBar}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => { setActiveTab(tab); setPage(1); }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.filterBar} style={{ marginBottom: '20px' }}>
        <button className={styles.pageBtn} onClick={() => fetchData()} title="Refresh" style={{ padding: '10px 12px' }}>
          <RefreshCw size={15} />
        </button>
      </div>

      <div className={styles.sectionCard}>
        {loading ? (
          <div className={styles.loadingWrap}>Loading withdrawals…</div>
        ) : withdrawals.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💸</div>
            No withdrawal requests found
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Period</th>
                    <th>Gross</th>
                    <th>Commission</th>
                    <th>Net Payout</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map(w => (
                    <tr key={w.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '13px' }}>{w.vendorName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{w.vendorEmail}</div>
                      </td>
                      <td style={{ fontSize: '13px', color: '#e2e8f0' }}>{MONTHS[w.month]} {w.year}</td>
                      <td style={{ fontWeight: 600, fontSize: '13px' }}>₹{w.amount?.toLocaleString('en-IN')}</td>
                      <td style={{ fontSize: '13px', color: '#f87171' }}>₹{w.commissionDeducted?.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 700, fontSize: '13px', color: '#22c55e' }}>₹{w.netAmount?.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`${styles.badge} ${STATUS_BADGE[w.status] || ''}`}>{w.status}</span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {new Date(w.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {w.status === 'PENDING' && (
                            <>
                              <button
                                className={`${styles.iconBtn} ${styles.btnSuccess}`}
                                disabled={updatingId === w.id}
                                onClick={() => handleAction(w.id, 'PROCESSING')}
                                title="Start processing"
                              >
                                <Clock size={14} />
                              </button>
                              <button
                                className={`${styles.iconBtn} ${styles.btnDanger}`}
                                disabled={updatingId === w.id}
                                onClick={() => handleAction(w.id, 'REJECTED')}
                                title="Reject"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                          {w.status === 'PROCESSING' && (
                            <button
                              className={`${styles.iconBtn} ${styles.btnSuccess}`}
                              disabled={updatingId === w.id}
                              onClick={() => handleAction(w.id, 'COMPLETED')}
                              title="Mark completed"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
              <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
