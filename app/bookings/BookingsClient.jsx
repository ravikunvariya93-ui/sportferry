'use client';

import React, { useState, useCallback } from 'react';
import { Calendar, MapPin, Clock, XCircle, AlertCircle, Info, ArrowDownCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const STATUS_STYLES = {
  CONFIRMED: { bg: 'rgba(22,163,74,0.1)',  color: '#16a34a', label: 'Confirmed',  border: 'var(--primary)' },
  PENDING:   { bg: 'rgba(251,191,36,0.1)', color: '#d97706', label: 'Pending',    border: '#d97706' },
  CANCELLED: { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', label: 'Cancelled',  border: '#cbd5e1' },
};

const REFUND_BADGE_STYLES = {
  FREE_CANCELLATION: { bg: 'rgba(22,163,74,0.12)', color: '#16a34a', icon: '✅' },
  LATE_CANCELLATION: { bg: 'rgba(251,191,36,0.12)', color: '#d97706', icon: '⚠️' },
  NO_REFUND:         { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626', icon: '❌' },
  BLOCKED:           { bg: 'rgba(100,116,139,0.12)', color: '#64748b', icon: '🚫' },
};

export default function BookingsClient({ initialBookings }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [confirmingId, setConfirmingId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [errorMap, setErrorMap] = useState({});
  const [previewMap, setPreviewMap] = useState({}); // cancellation preview data
  const [previewLoading, setPreviewLoading] = useState(null);

  const actionControllerRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (actionControllerRef.current) actionControllerRef.current.abort();
    };
  }, []);

  // Fetch cancellation preview before showing confirm dialog
  const fetchCancellationPreview = useCallback(async (bookingId) => {
    setPreviewLoading(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewMap(prev => ({ ...prev, [bookingId]: data.cancellationPreview }));
      }
    } catch (e) {
      // Silently fail — preview is non-critical
    } finally {
      setPreviewLoading(null);
    }
  }, []);

  const handleCancelClick = async (bookingId) => {
    setConfirmingId(bookingId);
    await fetchCancellationPreview(bookingId);
  };

  const handleCancel = async (bookingId) => {
    if (actionControllerRef.current) actionControllerRef.current.abort();
    actionControllerRef.current = new AbortController();
    const signal = actionControllerRef.current.signal;

    setLoadingId(bookingId);
    setErrorMap(prev => ({ ...prev, [bookingId]: null }));
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
        signal 
      });
      const d = await res.json();
      if (res.ok) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { 
          ...b, 
          status: 'CANCELLED',
          cancelledBy: 'PLAYER',
          refundPercent: d.refundPercent,
          refundAmount: d.refundAmount,
        } : b));
        setConfirmingId(null);
      } else {
        setErrorMap(prev => ({ ...prev, [bookingId]: d.message || 'Cancellation failed.' }));
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      setErrorMap(prev => ({ ...prev, [bookingId]: 'Network error. Please try again.' }));
    } finally {
      setLoadingId(null);
    }
  };

  if (bookings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
        <Calendar size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>No bookings yet</h3>
        <p style={{ marginBottom: '24px' }}>Discover local sports venues and make your first booking!</p>
        <Link href="/" className="btn-primary" style={{ padding: '12px 28px', borderRadius: '12px', display: 'inline-block' }}>
          Find Venues
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Cancellation Policy Banner */}
      <div
        className="glass-morphism"
        style={{
          padding: '16px 20px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          background: 'rgba(56,189,248,0.04)',
          border: '1px solid rgba(56,189,248,0.15)',
        }}
      >
        <Info size={18} style={{ color: '#38bdf8', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '6px', color: 'var(--foreground)' }}>
            Cancellation Policy
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: 'var(--muted)' }}>
            <span>✅ 24+ hrs → <strong style={{ color: '#16a34a' }}>100% refund</strong></span>
            <span>⚠️ 12–24 hrs → <strong style={{ color: '#d97706' }}>50% refund</strong></span>
            <span>❌ &lt;12 hrs → <strong style={{ color: '#dc2626' }}>No refund</strong></span>
          </div>
        </div>
        <Link
          href="/cancellation-policy"
          style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '600', whiteSpace: 'nowrap', textDecoration: 'none' }}
        >
          View Full Policy →
        </Link>
      </div>

      {bookings.map(booking => {
        const statusStyle = STATUS_STYLES[booking.status] || STATUS_STYLES.PENDING;
        const canCancel = booking.status !== 'CANCELLED' && !booking.isPast;
        const isConfirming = confirmingId === booking.id;
        const isLoading = loadingId === booking.id;
        const errMsg = errorMap[booking.id];
        const preview = previewMap[booking.id];
        const isPreviewLoading = previewLoading === booking.id;
        const isCancelled = booking.status === 'CANCELLED';

        return (
          <div
            key={booking.id}
            className="glass-morphism responsive-card responsive-padding"
            style={{
              padding: '20px 24px',
              borderLeft: `4px solid ${statusStyle.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            {/* Left info */}
            <div className="responsive-w-full" style={{ flex: 1, minWidth: '200px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>{booking.venue}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', color: 'var(--muted)', fontSize: '13px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} /> {booking.area}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> {booking.date}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} /> {booking.time}
                </div>
              </div>

              <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '100px', fontWeight: '600', background: statusStyle.bg, color: statusStyle.color }}>
                {statusStyle.label}
              </span>

              {/* Cancellation details for cancelled bookings */}
              {isCancelled && booking.cancelledBy && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239,68,68,0.04)',
                  border: '1px solid rgba(239,68,68,0.12)',
                  fontSize: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontWeight: '600', color: '#dc2626' }}>
                    <XCircle size={13} />
                    Cancelled by {booking.cancelledBy === 'PLAYER' ? 'You' : booking.cancelledBy === 'VENDOR' ? 'Venue Owner' : 'Admin'}
                  </div>
                  {booking.cancellationReason && (
                    <div style={{ color: 'var(--muted)', marginBottom: '4px' }}>
                      Reason: {booking.cancellationReason}
                    </div>
                  )}
                  {booking.refundAmount > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: '600' }}>
                      <ArrowDownCircle size={12} />
                      ₹{booking.refundAmount} refunded ({booking.refundPercent}%)
                    </div>
                  ) : (
                    <div style={{ color: 'var(--muted)' }}>No refund applicable</div>
                  )}
                </div>
              )}

              {/* Error message */}
              {errMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', color: '#dc2626', fontSize: '13px' }}>
                  <AlertCircle size={14} /> {errMsg}
                </div>
              )}
            </div>

            {/* Right: amount + action */}
            <div className="responsive-card-right" style={{ textAlign: 'right', flexShrink: 0, marginTop: '8px' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', marginBottom: '12px' }}>{booking.amount}</div>

              {canCancel && (
                isConfirming ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    {/* Refund preview */}
                    {isPreviewLoading ? (
                      <div style={{ fontSize: '12px', color: 'var(--muted)', padding: '8px 0' }}>
                        Checking refund policy…
                      </div>
                    ) : preview ? (
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        textAlign: 'left',
                        maxWidth: '260px',
                        background: (REFUND_BADGE_STYLES[preview.tag] || REFUND_BADGE_STYLES.NO_REFUND).bg,
                        border: `1px solid ${(REFUND_BADGE_STYLES[preview.tag] || REFUND_BADGE_STYLES.NO_REFUND).color}22`,
                      }}>
                        <div style={{ fontWeight: '700', marginBottom: '4px', color: (REFUND_BADGE_STYLES[preview.tag] || REFUND_BADGE_STYLES.NO_REFUND).color }}>
                          {(REFUND_BADGE_STYLES[preview.tag] || REFUND_BADGE_STYLES.NO_REFUND).icon} {preview.label}
                        </div>
                        {!preview.blocked && (
                          <>
                            <div style={{ color: 'var(--foreground)', fontWeight: '600' }}>
                              Refund: ₹{preview.refundAmount} ({preview.refundPercent}%)
                            </div>
                            <div style={{ color: 'var(--muted)', marginTop: '2px' }}>
                              {preview.hoursLeft}h until slot starts
                            </div>
                          </>
                        )}
                        {preview.blocked && (
                          <div style={{ color: 'var(--muted)' }}>
                            The slot has already started or passed.
                          </div>
                        )}
                      </div>
                    ) : null}

                    {preview && !preview.blocked && (
                      <>
                        <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>Proceed with cancellation?</p>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => { setConfirmingId(null); setPreviewMap(prev => { const next = {...prev}; delete next[booking.id]; return next; }); }}
                            style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', color: 'var(--foreground)' }}
                          >
                            Keep Booking
                          </button>
                          <button
                            onClick={() => handleCancel(booking.id)}
                            disabled={isLoading}
                            style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: '600', opacity: isLoading ? 0.7 : 1 }}
                          >
                            {isLoading ? 'Cancelling...' : 'Yes, Cancel'}
                          </button>
                        </div>
                      </>
                    )}

                    {preview && preview.blocked && (
                      <button
                        onClick={() => { setConfirmingId(null); setPreviewMap(prev => { const next = {...prev}; delete next[booking.id]; return next; }); }}
                        style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', color: 'var(--foreground)' }}
                      >
                        Close
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleCancelClick(booking.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#dc2626', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: '500' }}
                  >
                    <XCircle size={15} /> Cancel Booking
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
