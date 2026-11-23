'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Users, Trash2, RefreshCw, Ban, CheckCircle2, Download } from 'lucide-react';
import styles from '../admin.module.css';

const STATUS_TABS = [
  { key: '', label: 'All Users' },
  { key: 'active', label: 'Active' },
  { key: 'blocked', label: 'Blocked' },
];

function money(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}`; }

export default function UsersClient({ currentAdminId }) {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const initialRole = searchParams.get('role');
  const [roleFilter, setRoleFilter] = useState(['PLAYER', 'VENDOR', 'ADMIN'].includes(initialRole) ? initialRole : '');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', username: '', role: 'PLAYER', password: '' });

  const fetchUsers = useCallback(async (signal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/users?${params}`, { signal });
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => fetchUsers(controller.signal), search ? 400 : 0);
    return () => { clearTimeout(t); controller.abort(); };
  }, [fetchUsers, search]);

  const patchUser = async (userId, body) => {
    setBusyId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...body }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: data.role ?? u.role, blocked: data.blocked ?? u.blocked } : u));
      }
    } finally { setBusyId(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users?userId=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) { setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id)); setDeleteTarget(null); }
    } catch (e) { console.error(e); }
    finally { setDeleting(false); }
  };

  const exportCsv = () => {
    const header = 'Name,Mobile,City,Joined,Games,Spend,Status\n';
    const body = users.map(u => [u.name, u.phone, u.city, new Date(u.createdAt).toISOString().slice(0, 10), u.gamesPlayed, u.totalSpend, u.blocked ? 'Blocked' : 'Active'].map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={28} color="#22c55e" />
          <div>
            <h1 className={styles.pageTitle}>Users (Players)</h1>
            <p className={styles.pageSubtitle}>{total} accounts on the platform</p>
          </div>
          <button className={styles.pageBtn} onClick={() => setShowAdd(true)} style={{ marginLeft: 'auto', background: '#16a34a', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>+ Add User</button>
        </div>
      </div>

      <div className={styles.tabBar}>
        {STATUS_TABS.map(t => (
          <button key={t.key} className={`${styles.tab} ${statusFilter === t.key ? styles.tabActive : ''}`} onClick={() => { setStatusFilter(t.key); setPage(1); }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.sectionCard}>
        <div className={styles.filterBar}>
          <input className={styles.searchInput} placeholder="Search by name / mobile / email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className={styles.filterSelect} value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">All Roles</option>
            <option value="PLAYER">Player</option>
            <option value="VENDOR">Vendor</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button className={styles.pageBtn} onClick={() => fetchUsers()} title="Refresh" style={{ padding: '10px 12px' }}><RefreshCw size={15} /></button>
          <button className={styles.pageBtn} onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px' }}><Download size={15} /> Export</button>
        </div>

        {loading ? (
          <div className={styles.loadingWrap}>Loading users…</div>
        ) : users.length === 0 ? (
          <div className={styles.emptyState}><div className={styles.emptyIcon}>👥</div>No users found</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th><th>Player Name</th><th>Mobile</th><th>City</th><th>Joined On</th><th>Games Played</th><th>Total Spend</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id}>
                      <td>{(page - 1) * 20 + i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className={styles.userAvatar}>{u.name?.charAt(0)?.toUpperCase() || '?'}</div>
                          <div>
                            <Link href={`/admin/users/${u.id}`} style={{ fontWeight: 600, color: 'var(--admin-text-main)', fontSize: '13px', textDecoration: 'none' }}>{u.name}</Link>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '12px' }}>{u.phone || '—'}</td>
                      <td style={{ fontSize: '12px' }}>{u.city || '—'}</td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>{u.gamesPlayed}</td>
                      <td style={{ fontWeight: 600 }}>{money(u.totalSpend)}</td>
                      <td><span className={`${styles.badge} ${u.blocked ? styles.badgeCancelled : styles.badgeConfirmed}`}>{u.blocked ? 'Blocked' : 'Active'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <select className={styles.roleSelect} value={u.role} disabled={u.id === currentAdminId || busyId === u.id} onChange={(e) => patchUser(u.id, { role: e.target.value })}>
                            <option value="PLAYER">PLAYER</option><option value="VENDOR">VENDOR</option><option value="ADMIN">ADMIN</option>
                          </select>
                          {u.id !== currentAdminId && (
                            u.blocked
                              ? <button className={`${styles.iconBtn} ${styles.btnSuccess}`} disabled={busyId === u.id} onClick={() => patchUser(u.id, { blocked: false })} title="Unblock"><CheckCircle2 size={14} /></button>
                              : <button className={`${styles.iconBtn} ${styles.btnDanger}`} disabled={busyId === u.id} onClick={() => patchUser(u.id, { blocked: true })} title="Block"><Ban size={14} /></button>
                          )}
                          {u.id !== currentAdminId && (
                            <button className={`${styles.iconBtn} ${styles.btnDanger}`} onClick={() => setDeleteTarget(u)} title="Delete user"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {showAdd && (
        <div className={styles.modalOverlay}>
          <form className={styles.modalCard} style={{ maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '12px' }} onSubmit={async (e) => {
            e.preventDefault();
            const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) });
            if (res.ok) { setShowAdd(false); fetchUsers(); }
          }}>
            <h2 className={styles.modalTitle}>Add User</h2>
            {[['name', 'Name *'], ['email', 'Email *'], ['username', 'Username (defaults to email)'], ['password', 'Password (optional)']].map(([key, label]) => (
              <label key={key} style={{ fontSize: '12px', fontWeight: 600 }}>
                {label}
                <input className={styles.searchInput} style={{ width: '100%', marginTop: '4px' }} value={addForm[key]} type={key === 'password' ? 'password' : 'text'} onChange={e => setAddForm(p => ({ ...p, [key]: e.target.value }))} />
              </label>
            ))}
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Role
              <select className={styles.filterSelect} style={{ width: '100%', marginTop: '4px' }} value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}>
                {['PLAYER', 'VENDOR', 'ADMIN'].map(r => <option key={r}>{r}</option>)}
              </select>
            </label>
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
            <h2 className={styles.modalTitle}>Delete User?</h2>
            <p className={styles.modalDesc}>Are you sure you want to delete <strong style={{ color: 'var(--admin-text-main)' }}>{deleteTarget.name}</strong>? This action cannot be undone.</p>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className={styles.btnDelete} onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
