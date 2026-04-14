'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Building2, MapPin, Trash2, Edit2, User, RefreshCw, Star } from 'lucide-react';
import styles from '../admin.module.css';
import VenueModal from '@/components/VenueModal';

export default function VenuesClient() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingVenue, setEditingVenue] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/venues?${params}`);
      const data = await res.json();
      setVenues(data.venues || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(fetchVenues, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchVenues, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/venues?venueId=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setVenues((prev) => prev.filter((v) => v.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (e) { console.error(e); }
    finally { setDeleting(false); }
  };

  const FALLBACK_IMG = 'https://images.unsplash.com/photo-1529900948632-586bc48be71a?auto=format&fit=crop&q=80&w=400';

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Building2 size={28} color="#22c55e" />
          <div>
            <h1 className={styles.pageTitle}>Venues</h1>
            <p className={styles.pageSubtitle}>{total} venues registered on the platform</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <input
          className={styles.searchInput}
          placeholder="Search venues by name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <button className={styles.pageBtn} onClick={fetchVenues} title="Refresh" style={{ padding: '10px 12px' }}>
          <RefreshCw size={15} />
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}>Loading venues…</div>
      ) : venues.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏟️</div>
          No venues found
        </div>
      ) : (
        <>
          <div className={styles.venueGrid}>
            {venues.map((v) => (
              <div key={v.id} className={styles.venueCard}>
                <img
                  src={v.images?.[0] || FALLBACK_IMG}
                  alt={v.name}
                  className={styles.venueCardImg}
                  onError={(e) => { e.target.src = FALLBACK_IMG; }}
                />
                <div className={styles.venueCardBody}>
                  <div className={styles.venueCardName}>{v.name}</div>
                  <div className={styles.venueCardMeta}>
                    <MapPin size={11} style={{ display: 'inline', marginRight: '4px' }} />
                    {v.area}, {v.city}
                  </div>
                  <div className={styles.venueCardTags}>
                    {v.sportTypes?.slice(0, 3).map((s) => (
                      <span key={s} className={styles.sportTag}>{s}</span>
                    ))}
                    {v.sportTypes?.length > 3 && (
                      <span className={styles.sportTag}>+{v.sportTypes.length - 3}</span>
                    )}
                  </div>

                  <div className={styles.venueCardFooter}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--admin-text-sub)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={11} /> {v.ownerName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>{v.ownerEmail}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '15px' }}>₹{v.pricePerHour}/hr</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {v.bookingCount} bookings
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      className={styles.pageBtn}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      onClick={() => setEditingVenue(v)}
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                    <button
                      className={styles.btnDelete}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      onClick={() => setDeleteTarget(v)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
            <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        </>
      )}

      {/* Edit Venue Modal */}
      {editingVenue && (
        <VenueModal 
          editingVenue={editingVenue} 
          onClose={() => { setEditingVenue(null); fetchVenues(); }} 
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>Delete Venue?</h2>
            <p className={styles.modalDesc}>
              Are you sure you want to delete <strong style={{ color: 'var(--admin-text-main)' }}>{deleteTarget.name}</strong>?
              All associated bookings will be cancelled.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className={styles.btnDelete} onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete Venue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
