'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Users, Trash2, RefreshCw } from 'lucide-react';
import styles from '../admin.module.css';

const ROLE_BADGE = {
  ADMIN: styles.badgeAdmin,
  VENDOR: styles.badgeVendor,
  PLAYER: styles.badgeUser,
};

export default function UsersClient({ currentAdminId }) {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const initialRole = searchParams.get('role');
  const [roleFilter, setRoleFilter] = useState(['PLAYER', 'VENDOR', 'ADMIN'].includes(initialRole) ? initialRole : '');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(null);

  const fetchUsers = useCallback(async (signal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
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
  }, [page, search, roleFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => fetchUsers(controller.signal), search ? 400 : 0);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [fetchUsers, search]);

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingRole(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      }
    } catch (e) { 
      if (e.name === 'AbortError') return;
      console.error(e); 
    }
    finally { setUpdatingRole(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users?userId=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (e) { console.error(e); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={28} color="#22c55e" />
          <div>
            <h1 className={styles.pageTitle}>Users</h1>
            <p className={styles.pageSubtitle}>{total} total accounts on the platform</p>
          </div>
        </div>
      </div>

      <div className={styles.sectionCard}>
        {/* Filters */}
        <div className={styles.filterBar}>
          <input
            className={styles.searchInput}
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            className={styles.filterSelect}
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Roles</option>
            <option value="PLAYER">Player</option>
            <option value="VENDOR">Vendor</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            className={styles.pageBtn}
            onClick={fetchUsers}
            title="Refresh"
            style={{ padding: '10px 12px' }}
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className={styles.loadingWrap}>Loading users…</div>
        ) : users.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👥</div>
            No users found
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>City</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className={styles.userAvatar}>
                            {u.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <Link
                              href={`/admin/users/${u.id}`}
                              style={{ fontWeight: 600, color: 'var(--admin-text-main)', fontSize: '13px', textDecoration: 'none' }}
                            >
                              {u.name}
                            </Link>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '12px' }}>{u.city || '—'}</td>
                      <td style={{ fontSize: '12px' }}>{u.phone || '—'}</td>
                      <td>
                        <select
                          className={styles.roleSelect}
                          value={u.role}
                          disabled={u.id === currentAdminId || updatingRole === u.id}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        >
                          <option value="PLAYER">PLAYER</option>
                          <option value="VENDOR">VENDOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        {updatingRole === u.id && (
                          <span style={{ fontSize: '10px', color: '#22c55e', marginLeft: '6px' }}>saving…</span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>
                        {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        {u.id !== currentAdminId && (
                          <button
                            className={`${styles.iconBtn} ${styles.btnDanger}`}
                            onClick={() => setDeleteTarget(u)}
                            title="Delete user"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
              <button
                className={styles.pageBtn}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>Delete User?</h2>
            <p className={styles.modalDesc}>
              Are you sure you want to delete <strong style={{ color: 'var(--admin-text-main)' }}>{deleteTarget.name}</strong>?
              This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className={styles.btnDelete} onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
