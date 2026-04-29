'use client';

import React, { useState } from 'react';
import {
  TrendingUp, Calendar, LayoutDashboard, Users, Plus,
  MapPin, CheckCircle2, XCircle, Clock, AlertCircle, X,
  ShieldCheck, Lock, Edit2, ArrowDownCircle, MessageSquare
} from 'lucide-react';
import VenueModal from '@/components/VenueModal';
import OfflineBookingModal from './OfflineBookingModal';
import { useRouter } from 'next/navigation';

const STATUS_STYLES = {
  CONFIRMED: { bg: 'rgba(22,163,74,0.1)', color: '#16a34a', label: 'Confirmed' },
  PENDING:   { bg: 'rgba(251,191,36,0.1)', color: '#d97706', label: 'Pending' },
  CANCELLED: { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', label: 'Cancelled' },
};

export default function VendorDashboardClient({ venues, bookings, stats }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [loadingId, setLoadingId]     = useState(null);
  const [errorId, setErrorId]         = useState(null);
  const [errorMsg, setErrorMsg]       = useState('');
  const [localBookings, setLocalBookings] = useState(bookings);

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

  const handleCancel = async (bookingId) => {
    if (!cancelReason.trim()) {
      setErrorId(bookingId);
      setErrorMsg('Please provide a reason for cancellation.');
      return;
    }

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
        body: JSON.stringify({ status: 'CANCELLED', cancellationReason: cancelReason.trim() }),
        signal,
      });
      const d = await res.json();
      if (res.ok) {
        setLocalBookings(prev =>
          prev.map(b => b.id === bookingId ? { 
            ...b, 
            status: 'CANCELLED',
            cancelledBy: 'VENDOR',
            cancellationReason: cancelReason.trim(),
            refundPercent: d.refundPercent ?? 100,
            refundAmount: d.refundAmount ?? 0,
          } : b)
        );
        setCancellingId(null);
        setCancelReason('');
        router.refresh();
      } else {
        setErrorId(bookingId);
        setErrorMsg(d.message || 'Cancellation failed.');
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      setErrorId(bookingId);
      setErrorMsg('Network error.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      {showModal && <VenueModal onClose={() => setShowModal(false)} />}
      {editingVenue && <VenueModal editingVenue={editingVenue} onClose={() => setEditingVenue(null)} />}
      {showOfflineModal && <OfflineBookingModal venues={venues} onClose={() => setShowOfflineModal(false)} />}

      {/* Vendor Cancellation Reason Modal */}
      {cancellingId && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => { setCancellingId(null); setCancelReason(''); setErrorId(null); setErrorMsg(''); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card-bg, #0f172a)',
              border: '1px solid var(--glass-border)',
              borderRadius: '18px',
              padding: '28px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={20} color="#dc2626" />
                Cancel Booking
              </h3>
              <button onClick={() => { setCancellingId(null); setCancelReason(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Policy notice */}
            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(56,189,248,0.06)',
              border: '1px solid rgba(56,189,248,0.15)',
              fontSize: '12px',
              color: 'var(--muted)',
              marginBottom: '16px',
              lineHeight: '1.6',
            }}>
              <strong style={{ color: '#38bdf8' }}>⚡ Venue Cancellation Policy</strong><br />
              When you cancel a booking, the player receives a <strong style={{ color: '#16a34a' }}>100% full refund</strong>.
              Please provide a valid reason below.
            </div>

            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--foreground)' }}>
              <MessageSquare size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Cancellation Reason <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="e.g., Venue maintenance, weather conditions, emergency closure..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--glass-border)',
                background: 'var(--secondary)',
                color: 'var(--foreground)',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            {errorId === cancellingId && errorMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', color: '#dc2626', fontSize: '13px' }}>
                <AlertCircle size={14} /> {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button
                onClick={() => { setCancellingId(null); setCancelReason(''); setErrorId(null); setErrorMsg(''); }}
                style={{
                  padding: '10px 20px', borderRadius: '10px',
                  border: '1px solid var(--glass-border)', background: 'none',
                  color: 'var(--foreground)', cursor: 'pointer',
                  fontSize: '14px', fontFamily: 'inherit', fontWeight: '500',
                }}
              >
                Keep Booking
              </button>
              <button
                onClick={() => handleCancel(cancellingId)}
                disabled={loadingId === cancellingId}
                style={{
                  padding: '10px 20px', borderRadius: '10px',
                  border: 'none', background: '#dc2626', color: 'white',
                  cursor: loadingId === cancellingId ? 'not-allowed' : 'pointer',
                  fontSize: '14px', fontFamily: 'inherit', fontWeight: '600',
                  opacity: loadingId === cancellingId ? 0.7 : 1,
                }}
              >
                {loadingId === cancellingId ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <button 
                      onClick={() => setEditingVenue(venue)}
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--muted)', cursor: 'pointer' }}
                      title="Edit Venue"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bookings Table */}
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
                                  By {b.cancelledBy === 'PLAYER' ? 'Player' : b.cancelledBy === 'VENDOR' ? 'You' : 'Admin'}
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
                            
                            {b.status !== 'CANCELLED' && (
                              <button
                                onClick={() => { setCancellingId(b.id); setErrorId(null); setErrorMsg(''); }}
                                style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500' }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                          {hasError && errorId === b.id && !cancellingId && (
                            <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={12} /> {errorMsg}
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
