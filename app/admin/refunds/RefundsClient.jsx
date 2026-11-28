'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/clientApi';
import { formatINR } from '@/lib/format';
import Link from 'next/link';
import { RefreshCcw, Send, RefreshCw } from 'lucide-react';
import styles from '../admin.module.css';

const TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'FAILED', label: 'Failed' },
];
const BADGE = { PENDING: styles.badgePending, COMPLETED: styles.badgeConfirmed, FAILED: styles.badgeCancelled };

export default function RefundsClient() {
  const [data, setData] = useState({ refunds: [], kpis: {}, counts: {} });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('PENDING');
  const [selected, setSelected] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/refunds', { signal });
      setData(await res.json());
    } catch (e) { if (e.name !== 'AbortError') console.error(e); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const c = new AbortController(); load(c.signal); return () => c.abort(); }, [load]);

  const rows = (data.refunds || []).filter(r => r.status === tab);
  const pending = (data.refunds || []).filter(r => r.status === 'PENDING');
  const selectedRows = rows.filter(r => selected.includes(r.id));
  const totalSelected = selectedRows.reduce((s, r) => s + r.refundAmount, 0);
  const k = data.kpis || {};
  const c = data.counts || {};

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === rows.length ? [] : rows.map(r => r.id));

  const submit = async () => {
    setBusy(true); setResult(null);
    try {
      const res = await apiFetch('/api/admin/refunds', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingIds: selected }),
      });
      const d = await res.json();
      if (res.ok) { setResult(d); setSelected([]); setShowModal(false); load(); }
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <RefreshCcw size={28} color="#22c55e" />
          <div>
            <h1 className={styles.pageTitle}>Refunds (Cancelled Bookings)</h1>
            <p className={styles.pageSubtitle}>Process refunds for cancelled bookings.</p>
          </div>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {[
          ['Refundable Amount', formatINR(k.refundable), '#22c55e'],
          ['Cancelled Bookings', (k.cancelledBookings ?? 0).toString(), '#8b5cf6'],
          ['Refunds Processed', formatINR(k.processed), '#3b82f6'],
          [`Pending Refunds (${k.pendingCount ?? 0})`, formatINR(k.refundable), '#f59e0b'],
        ].map(([label, value, color]) => (
          <div key={label} className={styles.statCard}>
            <div>
              <div className={styles.statLabel}>{label}</div>
              <div className={styles.statValue} style={{ color }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.tabBar}>
        <a href="/api/admin/refunds?format=csv" className={styles.tab} style={{ marginLeft: 'auto', textDecoration: 'none' }}>Refund Report ↓</a>
        <Link href="/admin/settings" className={styles.tab} style={{ textDecoration: 'none' }}>⚙ Automation Settings</Link>
        {TABS.map(t => (
          <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`} onClick={() => { setTab(t.key); setSelected([]); }}>
            {t.label} ({c[t.key] ?? 0})
          </button>
        ))}
      </div>

      <div className={styles.sectionCard}>
        {loading ? (
          <div className={styles.loadingWrap}>Loading refunds…</div>
        ) : rows.length === 0 ? (
          <div className={styles.emptyState}><div className={styles.emptyIcon}>💸</div>No {tab.toLowerCase()} refunds.</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {tab === 'PENDING' && <th><input type="checkbox" checked={selected.length === rows.length && rows.length > 0} onChange={toggleAll} /></th>}
                    <th>#</th><th>Booking ID</th><th>Player</th><th>Venue / Turf</th><th>Type</th><th>Amount</th><th>Refund Amount</th><th>Method</th><th>Reason</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      {tab === 'PENDING' && <td><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} /></td>}
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{r.ref}</td>
                      <td>{r.userName}</td>
                      <td>{r.venueName} / T{r.turf}</td>
                      <td><span className={`${styles.badge} ${styles.badgeUser}`}>{r.classification}</span></td>
                      <td>{formatINR(r.amount)}</td>
                      <td style={{ fontWeight: 600 }}>{formatINR(r.refundAmount)}</td>
                      <td style={{ fontSize: '12px' }}>{r.method}</td>
                      <td style={{ fontSize: '12px', maxWidth: '180px' }}>{r.reason || '—'}</td>
                      <td><span className={`${styles.badge} ${BADGE[r.status]}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {tab === 'PENDING' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '18px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{selected.length} booking{selected.length !== 1 ? 's' : ''} selected · Total refund <strong style={{ color: 'var(--admin-text-main)' }}>{formatINR(totalSelected)}</strong></span>
                <button className={styles.pageBtn} disabled={!selected.length} onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: selected.length ? '#16a34a' : undefined, color: selected.length ? 'white' : undefined, border: 'none', padding: '10px 18px', marginLeft: 'auto' }}>
                  <Send size={15} /> Refund {formatINR(totalSelected)} to {selected.length} Player{selected.length !== 1 ? 's' : ''}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {result && (
        <div className={styles.sectionCard} style={{ borderColor: 'rgba(34,197,94,0.3)' }}>
          <strong style={{ color: 'var(--admin-text-main)' }}>Refund run complete:</strong>{' '}
          <span style={{ color: '#22c55e' }}>{result.completed} completed</span>, {' '}
          <span style={{ color: '#f87171' }}>{result.failed} failed</span>, {' '}
          <span style={{ color: '#64748b' }}>{result.skipped} skipped</span>.
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: '440px' }}>
            <h2 className={styles.modalTitle}>Confirm Bulk Refund</h2>
            <p className={styles.modalDesc}>
              Refund {formatINR(totalSelected)} to {selected.length} player{selected.length !== 1 ? 's' : ''}? This calls Razorpay and moves real money for online payments.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
              <button className={styles.btnCancel} style={{ background: '#16a34a', color: 'white', border: 'none' }} disabled={busy} onClick={submit}>{busy ? 'Processing…' : 'Confirm & Refund'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
