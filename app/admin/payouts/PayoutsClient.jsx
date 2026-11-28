'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/clientApi';
import { formatINR } from '@/lib/format';
import Link from 'next/link';
import { Wallet, RefreshCw, Send, CheckCircle2, XCircle } from 'lucide-react';
import styles from '../admin.module.css';

const TABS = ['Pending Payouts', 'Processing', 'Completed', 'Failed'];
const BATCH_STATUS = { PROCESSING: 'Processing', COMPLETED: 'Completed', FAILED: 'Failed', PENDING: 'Pending' };
const BADGE = { PROCESSING: styles.badgePending, COMPLETED: styles.badgeConfirmed, FAILED: styles.badgeCancelled, PENDING: styles.badgePending };

export default function PayoutsClient() {
  const [data, setData] = useState({ kpis: {}, vendors: [], batches: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Pending Payouts');
  const [selected, setSelected] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [method, setMethod] = useState('AUTOMATED');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (signal) => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/payouts', { signal });
      const d = await res.json();
      setData({ kpis: d.kpis || {}, vendors: d.vendors || [], batches: d.batches || [] });
    } catch (e) { if (e.name !== 'AbortError') console.error(e); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const c = new AbortController(); load(c.signal); return () => c.abort(); }, [load]);

  const pending = data.vendors.filter(v => v.payable > 0);
  const selectedRows = pending.filter(v => selected.includes(v.vendorId));
  const totalSelected = selectedRows.reduce((s, v) => s + v.payable, 0);

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === pending.length ? [] : pending.map(v => v.vendorId));

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const res = await apiFetch('/api/admin/payouts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorIds: selected, method, reference }),
      });
      const d = await res.json();
      if (res.ok) { setShowModal(false); setSelected([]); setReference(''); load(); }
      else setError(d.message || 'Payout failed.');
    } catch { setError('Network error.'); }
    finally { setBusy(false); }
  };

  const updateBatch = async (batchId, status) => {
    const res = await apiFetch('/api/admin/payouts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId, status }),
    });
    if (res.ok) load();
  };

  const batchesForTab = data.batches.filter(b => b.status === (tab === 'Processing' ? 'PROCESSING' : tab === 'Completed' ? 'COMPLETED' : 'FAILED'));
  const k = data.kpis;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Wallet size={28} color="#22c55e" />
          <div>
            <h1 className={styles.pageTitle}>Payouts &amp; Settlements</h1>
            <p className={styles.pageSubtitle}>Settle vendor earnings (after commission) with a bulk payout.</p>
          </div>
          <a href="/api/admin/payouts?format=csv" className={styles.tab} style={{ marginLeft: 'auto', textDecoration: 'none' }}>Settlement Report ↓</a>
          <Link href="/admin/settings" className={styles.tab} style={{ textDecoration: 'none' }}>⚙ Automation Settings</Link>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {[
          ['Gross Booking Value', formatINR(k.gross), '#22c55e'],
          [`Sportferry Commission (${k.commissionPercent ?? 12}%)`, formatINR(k.commission), '#8b5cf6'],
          ['Payable to Vendors', formatINR(k.payable), '#3b82f6'],
          [`Pending Payouts (${k.pendingCount ?? 0})`, formatINR(k.payable), '#f59e0b'],
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
        {TABS.map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => { setTab(t); setSelected([]); }}>
            {t}{t === 'Pending Payouts' ? ` (${pending.length})` : ''}
          </button>
        ))}
        <Link href="/admin/withdrawals" className={styles.tab} style={{ marginLeft: 'auto', textDecoration: 'none' }}>Withdrawal requests →</Link>
      </div>

      <div className={styles.sectionCard}>
        {loading ? (
          <div className={styles.loadingWrap}>Loading payouts…</div>
        ) : tab === 'Pending Payouts' ? (
          pending.length === 0 ? (
            <div className={styles.emptyState}><div className={styles.emptyIcon}>💸</div>Nothing pending — every vendor is settled.</div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th><input type="checkbox" checked={selected.length === pending.length && pending.length > 0} onChange={toggleAll} /></th>
                      <th>#</th><th>Vendor</th><th>Bookings</th><th>Gross Value</th><th>Commission</th><th>Payable Amount</th><th>Bank Account</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((v, i) => (
                      <tr key={v.vendorId}>
                        <td><input type="checkbox" checked={selected.includes(v.vendorId)} onChange={() => toggle(v.vendorId)} /></td>
                        <td>{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--admin-text-main)' }}>{v.vendorName}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{v.venueName}</div>
                        </td>
                        <td>{v.bookings}</td>
                        <td>{formatINR(v.gross)}</td>
                        <td style={{ color: '#f87171' }}>{formatINR(v.commission)}</td>
                        <td style={{ fontWeight: 700, color: '#22c55e' }}>{formatINR(v.payable)}</td>
                        <td style={{ fontSize: '12px' }}>{v.bank?.accountNumber ? `${v.bank.accountNumber} (${v.bank.bankName})` : '—'}</td>
                        <td><span className={`${styles.badge} ${styles.badgePending}`}>Pending</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '18px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{selected.length} vendor{selected.length !== 1 ? 's' : ''} selected · Total payable <strong style={{ color: 'var(--admin-text-main)' }}>{formatINR(totalSelected)}</strong></span>
                <button className={styles.pageBtn} disabled={!selected.length} onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: selected.length ? '#16a34a' : undefined, color: selected.length ? 'white' : undefined, border: 'none', padding: '10px 18px', marginLeft: 'auto' }}>
                  <Send size={15} /> Pay {formatINR(totalSelected)} to {selected.length} Vendor{selected.length !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          )
        ) : (
          batchesForTab.length === 0 ? (
            <div className={styles.emptyState}>No {tab.toLowerCase()} payouts.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Vendor</th><th>Bookings</th><th>Gross</th><th>Commission</th><th>Net</th><th>Method</th><th>Reference</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {batchesForTab.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600, color: 'var(--admin-text-main)' }}>{b.vendorName}</td>
                      <td>{b.bookingsCount}</td>
                      <td>{formatINR(b.gross)}</td>
                      <td style={{ color: '#f87171' }}>{formatINR(b.commission)}</td>
                      <td style={{ fontWeight: 700, color: '#22c55e' }}>{formatINR(b.net)}</td>
                      <td>{b.method}</td>
                      <td style={{ fontSize: '12px' }}>{b.reference || '—'}</td>
                      <td><span className={`${styles.badge} ${BADGE[b.status]}`}>{BATCH_STATUS[b.status]}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {b.status === 'PROCESSING' && <button className={`${styles.iconBtn} ${styles.btnSuccess}`} onClick={() => updateBatch(b.id, 'COMPLETED')} title="Mark completed"><CheckCircle2 size={14} /></button>}
                          {b.status !== 'COMPLETED' && <button className={`${styles.iconBtn} ${styles.btnDanger}`} onClick={() => updateBatch(b.id, 'FAILED')} title="Mark failed"><XCircle size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: '460px' }}>
            <h2 className={styles.modalTitle}>Confirm Bulk Payout</h2>
            <p className={styles.modalDesc}>Pay {formatINR(totalSelected)} to {selected.length} vendor{selected.length !== 1 ? 's' : ''}.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', cursor: 'pointer' }}>
                <input type="radio" name="method" checked={method === 'AUTOMATED'} onChange={() => setMethod('AUTOMATED')} style={{ marginTop: '2px' }} />
                <span><strong>Automated Bank Transfer</strong> (recommended)<div style={{ fontSize: '11px', color: '#64748b' }}>Recorded as a settlement; the transfer is completed out of band.</div></span>
              </label>
              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', cursor: 'pointer' }}>
                <input type="radio" name="method" checked={method === 'MANUAL'} onChange={() => setMethod('MANUAL')} style={{ marginTop: '2px' }} />
                <span><strong>Manual Transfer (Mark as Paid)</strong><div style={{ fontSize: '11px', color: '#64748b' }}>Marks the payout completed with a reference number.</div></span>
              </label>
              {method === 'MANUAL' && (
                <input className={styles.searchInput} style={{ width: '100%' }} placeholder="Reference / UTR number" value={reference} onChange={e => setReference(e.target.value)} />
              )}
            </div>
            {error && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
              <button className={styles.btnCancel} style={{ background: '#16a34a', color: 'white', border: 'none' }} disabled={busy} onClick={submit}>{busy ? 'Processing…' : 'Confirm & Make Payout'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
