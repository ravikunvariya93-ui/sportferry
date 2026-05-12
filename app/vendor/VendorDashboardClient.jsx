'use client';

import React, { useState } from 'react';
import {
  TrendingUp, Calendar, LayoutDashboard, Users, Plus,
  MapPin, CheckCircle2, Clock, Edit2, ArrowDownCircle,
  ShieldCheck, Lock, Info, Wallet, AlertTriangle, Trash2
} from 'lucide-react';
import VenueModal from '@/components/VenueModal';
import OfflineBookingModal from './OfflineBookingModal';
import { useRouter } from 'next/navigation';

const STATUS_STYLES = {
  CONFIRMED: { bg: 'rgba(22,163,74,0.1)', color: '#16a34a', label: 'Confirmed' },
  PENDING:   { bg: 'rgba(251,191,36,0.1)', color: '#d97706', label: 'Pending' },
  CANCELLED: { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', label: 'Cancelled' },
  PAYMENT_PENDING: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Payment Pending' },
};

export default function VendorDashboardClient({ venues, bookings, stats }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [loadingId, setLoadingId]     = useState(null);
  const [errorId, setErrorId]         = useState(null);
  const [errorMsg, setErrorMsg]       = useState('');
  const [localBookings, setLocalBookings] = useState(bookings);
  const [showInstructions, setShowInstructions] = useState(true);

  const actionControllerRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (actionControllerRef.current) actionControllerRef.current.abort();
    };
  }, []);

  const handleApprove = async (bookingId) => {
    if (actionControllerRef.current) actionControllerRef.current.abort();
    actionControllerRef.current = new AbortController();
    const signal = actionControllerRef.current.signal;

    setLoadingId(bookingId);
    setErrorId(null);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED' }),
        signal,
      });
      if (res.ok) {
        setLocalBookings(prev =>
          prev.map(b => b.id === bookingId ? { ...b, status: 'CONFIRMED' } : b)
        );
        router.refresh();
      } else {
        setErrorId(bookingId);
        const d = await res.json().catch(() => ({}));
        setErrorMsg(d.message || 'Failed to approve.');
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      setErrorId(bookingId);
      setErrorMsg('Network error.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteVenue = async (venueId) => {
    if (!window.confirm('Are you sure you want to delete this venue? This will also delete all associated bookings.')) {
      return;
    }
    try {
      const res = await fetch(`/api/venues/${venueId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete venue.');
      }
    } catch (e) {
      alert('Network error. Failed to delete venue.');
    }
  };

  return (
    <>
      {showModal && <VenueModal onClose={() => setShowModal(false)} />}
      {editingVenue && <VenueModal editingVenue={editingVenue} onClose={() => setEditingVenue(null)} />}
      {showOfflineModal && <OfflineBookingModal venues={venues} onClose={() => setShowOfflineModal(false)} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: '800', marginBottom: '6px', letterSpacing: '-0.5px' }}>Vendor Dashboard</h1>
            <p style={{ color: 'var(--muted)', fontSize: '15px' }}>Manage your venues and track performance.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowOfflineModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: '600', background: 'var(--secondary)', border: '1px solid var(--glass-border)', color: 'var(--foreground)', cursor: 'pointer' }}
            >
              <Lock size={18} /> Book Offline
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: '600' }}
            >
              <Plus size={18} /> Register New Venue
            </button>
          </div>
        </header>

        {/* ── Vendor Instructions Banner ─────────────────────────────────── */}
        {showInstructions && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(99,102,241,0.08))',
            border: '1px solid rgba(56,189,248,0.2)',
            borderRadius: '16px',
            padding: '24px',
            position: 'relative',
          }}>
            <button
              onClick={() => setShowInstructions(false)}
              style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '18px' }}
            >×</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ padding: '8px', background: 'rgba(56,189,248,0.15)', borderRadius: '10px' }}>
                <Info size={20} color="#38bdf8" />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: '700' }}>Vendor Guidelines & Instructions</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '14px', background: 'var(--secondary)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Wallet size={16} color="#10b981" />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>Commission: 12%</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.6' }}>
                  SportFerry deducts a 12% platform commission from each confirmed booking. You receive 88% of the booking amount.
                </p>
              </div>
              <div style={{ padding: '14px', background: 'var(--secondary)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <AlertTriangle size={16} color="#f59e0b" />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#f59e0b' }}>No Cancellation</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.6' }}>
                  Vendors cannot cancel bookings. If an issue arises, contact admin for assistance.
                </p>
              </div>
              <div style={{ padding: '14px', background: 'var(--secondary)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CheckCircle2 size={16} color="#22c55e" />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#22c55e' }}>Auto-Confirm</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.6' }}>
                  Bookings auto-confirm when both teams have at least 3 players. No manual approval needed.
                </p>
              </div>
              <div style={{ padding: '14px', background: 'var(--secondary)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Calendar size={16} color="#8b5cf6" />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#8b5cf6' }}>Monthly Withdrawal</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.6' }}>
                  You can request a withdrawal once per month. Earnings are calculated from confirmed bookings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {stats.map(stat => {
            const Icon = { TrendingUp, Calendar, LayoutDashboard, Users }[stat.iconName];
            return (
              <div key={stat.label} className="glass-morphism" style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '18px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${stat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>
                  {Icon && <Icon size={22} />}
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>{stat.label}</div>
                  <div style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>{stat.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Venues */}
        <section className="glass-morphism" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Your Venues ({venues.length})</h2>
          {venues.length === 0 ? (
            <div style={{ color: 'var(--muted)', padding: '24px', textAlign: 'center', background: 'var(--secondary)', borderRadius: '12px' }}>
              No venues yet. Register your first venue to get started!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {venues.map(venue => (
                <div key={venue.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--secondary)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                  <img
                    src={venue.images[0] || 'https://images.unsplash.com/photo-1529900948632-586bc48be71a?auto=format&fit=crop&q=80&w=200'}
                    alt={venue.name}
                    style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{venue.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>
                      <MapPin size={13} /> {venue.area}, {venue.city}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {venue.sportTypes.map(s => (
                        <span key={s} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(22,163,74,0.1)', color: 'var(--primary)', fontWeight: '600' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Price / hr</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>₹{venue.pricePerHour}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => setEditingVenue(venue)}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--muted)', cursor: 'pointer' }}
                        title="Edit Venue"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteVenue(venue.id || venue._id)}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer' }}
                        title="Delete Venue"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bookings Table — No Cancel Button for Vendor */}
        <section className="glass-morphism" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>All Bookings ({localBookings.length})</h2>
          {localBookings.length === 0 ? (
            <div style={{ color: 'var(--muted)', padding: '24px', textAlign: 'center', background: 'var(--secondary)', borderRadius: '12px' }}>
              No bookings have been made on your venues yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                    {['Customer', 'Venue', 'Date', 'Slot', 'Amount', 'Type', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {localBookings.map(b => {
                    const statusStyle = STATUS_STYLES[b.status] || STATUS_STYLES.PENDING;
                    const isLoading = loadingId === b.id;
                    const hasError = errorId === b.id;
                    const isCancelled = b.status === 'CANCELLED';
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                              {b.userInitials}
                            </div>
                            <span style={{ fontWeight: '500' }}>{b.userName}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--muted)' }}>{b.venueName}</td>
                        <td style={{ padding: '12px', whiteSpace: 'nowrap', color: 'var(--muted)' }}>{b.dateStr}</td>
                        <td style={{ padding: '12px', whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: '13px' }}>{b.slot}</td>
                        <td style={{ padding: '12px', fontWeight: '600' }}>₹{b.amount}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--glass-border)', textTransform: 'uppercase' }}>
                              {b.classification}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>({b.playersCount}p)</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: '600', background: statusStyle.bg, color: statusStyle.color }}>
                                {statusStyle.label}
                              </span>
                              {b.bookingType === 'OFFLINE' && (
                                <span style={{ fontSize: '10px', color: 'var(--muted)', background: 'var(--secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>OFFLINE</span>
                              )}
                            </div>
                            {/* Cancellation details inline */}
                            {isCancelled && b.cancelledBy && (
                              <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.5' }}>
                                <span style={{ color: '#dc2626', fontWeight: '600' }}>
                                  By {b.cancelledBy === 'PLAYER' ? 'Player' : b.cancelledBy === 'ADMIN' ? 'Admin' : 'System'}
                                </span>
                                {b.cancellationReason && (
                                  <span> — {b.cancellationReason.length > 40 ? b.cancellationReason.substring(0, 40) + '…' : b.cancellationReason}</span>
                                )}
                                {b.refundAmount > 0 && (
                                  <div style={{ color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                                    <ArrowDownCircle size={11} /> ₹{b.refundAmount} refund ({b.refundPercent}%)
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {b.status === 'PENDING' && (
                              <button
                                onClick={() => handleApprove(b.id)}
                                disabled={isLoading}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}
                              >
                                {isLoading ? '...' : <><ShieldCheck size={14} /> Approve</>}
                              </button>
                            )}
                            {/* Vendor cannot cancel — removed cancel button */}
                          </div>
                          {hasError && errorId === b.id && (
                            <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle size={12} /> {errorMsg}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

    </>
  );
}
