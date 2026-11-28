'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/clientApi';
import { formatBookingDate } from '@/lib/ist';
import Link from 'next/link';
import { Building2, MapPin, Trash2, Eye, RefreshCw, CheckCircle2, Ban, XCircle, Download } from 'lucide-react';
import styles from '../admin.module.css';

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'SUSPENDED', label: 'Suspended' },
  { key: 'REJECTED', label: 'Rejected' },
];

const STATUS_BADGE = {
  ACTIVE: styles.badgeConfirmed,
  PENDING: styles.badgePending,
  SUSPENDED: styles.badgeCancelled,
  REJECTED: styles.badgeCancelled,
  DRAFT: styles.badgeUser,
};

export default function VendorsClient() {
  const [venues, setVenues] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', ownerName: '', email: '', city: 'Ahmedabad', area: '', pricePerHour: 1000, numberOfTurfs: 1, password: '' });

  const fetchVenues = useCallback(async (signal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12, counts: '1' });
      if (search) params.set('search', search);
      if (tab !== 'ALL') params.set('status', tab);
      const res = await apiFetch(`/api/admin/venues?${params}`, { signal });
      const data = await res.json();
      setVenues(data.venues || []);
      setCounts(data.counts || {});
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, tab]);

  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => fetchVenues(controller.signal), search ? 400 : 0);
    return () => { clearTimeout(t); controller.abort(); };
  }, [fetchVenues, search]);

  const setStatus = async (id, onboardingStatus) => {
    const res = await apiFetch('/api/admin/venues', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venueId: id, onboardingStatus }),
    });
    if (res.ok) fetchVenues();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/admin/venues?venueId=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) { setDeleteTarget(null); fetchVenues(); }
    } finally { setDeleting(false); }
  };

  const exportCsv = () => {
    const header = 'Vendor,Owner,Phone,City,Area,Turfs,Sports,Status,Joined\n';
    const body = venues.map(v => [v.name, v.ownerName, v.ownerPhone, v.city, v.area, v.numberOfTurfs, (v.sportTypes || []).join(' '), v.onboardingStatus, new Date(v.joinedOn || v.createdAt).toISOString().slice(0, 10)].map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'vendors.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Building2 size={28} color="#22c55e" />
          <div>
            <h1 className={styles.pageTitle}>Vendors (Ground Owners)</h1>
            <p className={styles.pageSubtitle}>{counts.ALL ?? total} venues across the platform</p>
          </div>
          <button className={styles.pageBtn} onClick={() => setShowAdd(true)} style={{ marginLeft: 'auto', background: '#16a34a', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>+ Add Vendor</button>
        </div>
      </div>

      <div className={styles.tabBar}>
        {TABS.map(t => (
          <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`} onClick={() => { setTab(t.key); setPage(1); }}>
            {t.label} ({t.key === 'ALL' ? (counts.ALL ?? 0) : (counts[t.key] ?? 0)})
          </button>
        ))}
      </div>

      <div className={styles.filterBar}>
        <input className={styles.searchInput} placeholder="Search by vendor / owner / mobile / email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <button className={styles.pageBtn} onClick={() => fetchVenues()} title="Refresh" style={{ padding: '10px 12px' }}><RefreshCw size={15} /></button>
        <button className={styles.pageBtn} onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px' }}><Download size={15} /> Export</button>
      </div>

      <div className={styles.sectionCard}>
        {loading ? (
          <div className={styles.loadingWrap}>Loading vendors…</div>
        ) : venues.length === 0 ? (
          <div className={styles.emptyState}><div className={styles.emptyIcon}>🏟️</div>No vendors found</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th><th>Vendor / Owner</th><th>Location</th><th>Turfs</th><th>Sports</th><th>Status</th><th>Joined On</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {venues.map((v, i) => (
                    <tr key={v.id}>
                      <td>{(page - 1) * 12 + i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--admin-text-main)' }}>{v.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{v.ownerName}{v.ownerPhone ? ` · ${v.ownerPhone}` : ''}</div>
                      </td>
                      <td style={{ fontSize: '12.5px' }}>{v.area}, {v.city}</td>
                      <td>{v.numberOfTurfs || 1}</td>
                      <td style={{ fontSize: '12px' }}>{(v.sportTypes || []).join(', ')}</td>
                      <td><span className={`${styles.badge} ${STATUS_BADGE[v.onboardingStatus] || styles.badgeUser}`}>{v.onboardingStatus}</span></td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{formatBookingDate(v.joinedOn || v.createdAt, { day: '2-digit' })}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <Link href={`/admin/vendors/${v.id}`} className={styles.iconBtn} style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', textDecoration: 'none' }} title="View"><Eye size={14} /></Link>
                          {v.onboardingStatus === 'PENDING' && (
                            <>
                              <button className={`${styles.iconBtn} ${styles.btnSuccess}`} onClick={() => setStatus(v.id, 'ACTIVE')} title="Approve"><CheckCircle2 size={14} /></button>
                              <button className={`${styles.iconBtn} ${styles.btnDanger}`} onClick={() => setStatus(v.id, 'REJECTED')} title="Reject"><XCircle size={14} /></button>
                            </>
                          )}
                          {v.onboardingStatus === 'ACTIVE' && (
                            <button className={`${styles.iconBtn} ${styles.btnDanger}`} onClick={() => setStatus(v.id, 'SUSPENDED')} title="Suspend"><Ban size={14} /></button>
                          )}
                          {v.onboardingStatus === 'SUSPENDED' && (
                            <button className={`${styles.iconBtn} ${styles.btnSuccess}`} onClick={() => setStatus(v.id, 'ACTIVE')} title="Reactivate"><CheckCircle2 size={14} /></button>
                          )}
                          <button className={`${styles.iconBtn} ${styles.btnDanger}`} onClick={() => setDeleteTarget(v)} title="Delete"><Trash2 size={14} /></button>
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

      {showAdd && (
        <div className={styles.modalOverlay}>
          <form className={styles.modalCard} style={{ maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '12px' }} onSubmit={async (e) => {
            e.preventDefault();
            const res = await apiFetch('/api/admin/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) });
            if (res.ok) { setShowAdd(false); fetchVenues(); }
          }}>
            <h2 className={styles.modalTitle}>Add Vendor</h2>
            {[
              ['name', 'Venue name *'], ['ownerName', 'Owner name *'], ['email', 'Owner email *'], ['city', 'City'], ['area', 'Area'],
              ['pricePerHour', 'Price / hour'], ['numberOfTurfs', 'Turfs'], ['password', 'Password (optional)'],
            ].map(([key, label]) => (
              <label key={key} style={{ fontSize: '12px', fontWeight: 600 }}>
                {label}
                <input className={styles.searchInput} style={{ width: '100%', marginTop: '4px' }} value={addForm[key]} type={key === 'password' ? 'password' : 'text'}
                  onChange={e => setAddForm(p => ({ ...p, [key]: e.target.value }))} />
              </label>
            ))}
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnCancel} onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className={styles.btnCancel} style={{ background: '#16a34a', color: 'white', border: 'none' }}>Create</button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>Delete Venue?</h2>
            <p className={styles.modalDesc}>Delete <strong style={{ color: 'var(--admin-text-main)' }}>{deleteTarget.name}</strong>? All associated bookings will be cancelled.</p>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className={styles.btnDelete} onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete Venue'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
