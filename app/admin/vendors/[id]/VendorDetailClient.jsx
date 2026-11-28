'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/clientApi';
import { formatBookingDate } from '@/lib/ist';
import { formatINR, formatDayMonth } from '@/lib/format';
import Link from 'next/link';
import { ArrowLeft, Building2, MapPin, Phone, Mail, CheckCircle2, Ban, XCircle } from 'lucide-react';
import styles from '../../admin.module.css';

const TABS = ['Overview', 'Turfs', 'Pricing & Slots', 'Documents', 'Payouts', 'Activity'];

const STATUS_BADGE = {
  ACTIVE: styles.badgeConfirmed, PENDING: styles.badgePending,
  SUSPENDED: styles.badgeCancelled, REJECTED: styles.badgeCancelled,
};

export default function VendorDetailClient({ venueId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/vendors/${venueId}`);
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [venueId]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (onboardingStatus) => {
    const res = await apiFetch('/api/admin/venues', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venueId, onboardingStatus }),
    });
    if (res.ok) load();
  };

  if (loading) return <div className={styles.loadingWrap}>Loading vendor…</div>;
  if (!data) return <div className={styles.emptyState}>Vendor not found.</div>;

  const { venue, owner, turfs, performance, withdrawals, activity } = data;

  return (
    <div>
      <Link href="/admin/vendors" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', textDecoration: 'none', marginBottom: '16px' }}>
        <ArrowLeft size={15} /> Vendor Details
      </Link>

      <div className={styles.sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div className={styles.statIconWrap} style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}><Building2 size={22} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-text-main)' }}>{venue.name}</h1>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span>{owner.name}</span>
              {owner.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {owner.phone}</span>}
              {owner.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {owner.email}</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {venue.area}, {venue.city}</span>
            </div>
          </div>
          <span className={`${styles.badge} ${STATUS_BADGE[venue.onboardingStatus] || styles.badgeUser}`}>{venue.onboardingStatus}</span>
          {venue.onboardingStatus === 'PENDING' && (
            <>
              <button className={styles.pageBtn} style={{ background: '#16a34a', color: 'white', border: 'none' }} onClick={() => setStatus('ACTIVE')}>Approve</button>
              <button className={styles.btnDelete} style={{ padding: '8px 14px' }} onClick={() => setStatus('REJECTED')}>Reject</button>
            </>
          )}
          {venue.onboardingStatus === 'ACTIVE' && (
            <button className={styles.btnDelete} style={{ padding: '8px 14px' }} onClick={() => setStatus('SUSPENDED')}>Suspend</button>
          )}
        </div>
      </div>

      <div className={styles.tabBar}>
        {TABS.map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
            {t}{t === 'Turfs' ? ` (${turfs.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className={styles.overviewGrid}>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Vendor Information</h2>
            <table className={styles.table}>
              <tbody>
                {[['Owner', owner.name], ['Mobile', owner.phone || '—'], ['Email', owner.email || '—'], ['City', owner.city || venue.city],
                  ['Address', venue.address], ['Sports', (venue.sportTypes || []).join(', ') || '—'], ['Turfs', `${turfs.length}`],
                  ['Joined On', formatBookingDate(venue.joinedOn, { day: '2-digit' })]].map(([k, v]) => (
                  <tr key={k}><td style={{ color: '#64748b', width: '42%' }}>{k}</td><td style={{ fontWeight: 600, color: 'var(--admin-text-main)' }}>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Performance (Last 30 Days)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[['Total Bookings', performance.bookings], ['Booking Value', formatINR(performance.bookingValue)],
                [`Commission (${data.commissionPercent}%)`, formatINR(performance.commission)], ['Fill Rate', `${performance.fillRate}%`]].map(([k, v]) => (
                <div key={k} style={{ padding: '14px', border: '1px solid var(--admin-border)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800 }}>{v}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'Turfs' && (
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Turfs / Courts</h2>
          {turfs.length === 0 ? <div className={styles.emptyState}>No turfs added.</div> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>#</th><th>Name</th><th>Sport</th><th>Size</th><th>Surface</th><th>Format</th><th>Lighting</th></tr></thead>
                <tbody>
                  {turfs.map(t => (
                    <tr key={t.id}>
                      <td>{t.order}</td><td style={{ fontWeight: 600 }}>{t.name}</td><td>{t.sport}</td>
                      <td>{t.size?.length ? `${t.size.length} × ${t.size.width} ${t.size.unit}` : '—'}</td>
                      <td>{t.surface}</td><td>{t.playingFormat || '—'}</td>
                      <td>{t.lighting ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'Pricing & Slots' && (
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Pricing</h2>
          <table className={styles.table}>
            <thead><tr><th>Weekday (₹/hr)</th><th>Weekend (₹/hr)</th><th>Peak (₹/hr)</th><th>Discount</th></tr></thead>
            <tbody>
              <tr>
                <td>{venue.pricing?.weekday ?? venue.pricePerHour ?? '—'}</td>
                <td>{venue.pricing?.weekend ?? '—'}</td>
                <td>{venue.pricing?.peak ?? '—'}</td>
                <td>{venue.discountPercent ?? 0}%</td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>Base price per hour: {formatINR(venue.pricePerHour)}. Peak applies 5–11 PM.</p>
        </div>
      )}

      {tab === 'Documents' && (
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Verification Documents</h2>
          <table className={styles.table}>
            <tbody>
              {[['Business / Owner ID Proof', venue.documents?.businessIdProof], ['Business Proof', venue.documents?.businessProof], ['Venue Proof', venue.documents?.venueProof]].map(([k, url]) => (
                <tr key={k}>
                  <td style={{ color: '#64748b', width: '40%' }}>{k}</td>
                  <td>{url ? <a href={url} target="_blank" rel="noreferrer" style={{ color: '#22c55e' }}>View document</a> : <span style={{ color: '#64748b' }}>Not uploaded</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Payouts' && (
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Withdrawals</h2>
          <table className={styles.table}>
            <thead><tr><th>Period</th><th>Net</th><th>Status</th><th>Requested</th></tr></thead>
            <tbody>
              {withdrawals.length === 0 ? (
                <tr><td colSpan={4} style={{ color: '#64748b' }}>No withdrawal requests.</td></tr>
              ) : withdrawals.map(w => (
                <tr key={w.id}>
                  <td>{w.month}/{w.year}</td><td style={{ fontWeight: 600 }}>{formatINR(w.netAmount)}</td>
                  <td><span className={styles.badge}>{w.status}</span></td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>{formatDayMonth(w.requestedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '12px' }}>
            <Link href="/admin/payouts" style={{ color: '#22c55e', fontSize: '13px' }}>Go to Payouts & Settlements →</Link>
          </div>
        </div>
      )}

      {tab === 'Activity' && (
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Booking</th><th>Date</th><th>Slot</th><th>Type</th><th>Players</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {activity.length === 0 ? (
                  <tr><td colSpan={7} style={{ color: '#64748b' }}>No bookings yet.</td></tr>
                ) : activity.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.ref} · {a.userName}</td>
                    <td>{formatDayMonth(a.date)}</td>
                    <td>{a.slot}</td>
                    <td>{a.bookingType === 'OFFLINE' ? 'Offline' : a.classification}</td>
                    <td>{a.playersCount}</td>
                    <td style={{ fontWeight: 600 }}>{formatINR(a.amount)}</td>
                    <td><span className={styles.badge}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
