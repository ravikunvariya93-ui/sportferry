'use client';

import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, ArrowDownCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const STATUS_STYLES = {
  CONFIRMED: { bg: 'rgba(22,163,74,0.1)', color: '#16a34a', label: 'Confirmed' },
  PENDING:   { bg: 'rgba(251,191,36,0.1)', color: '#d97706', label: 'Pending' },
  CANCELLED: { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', label: 'Cancelled' },
  PAYMENT_PENDING: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Payment Pending' },
};

export default function VendorBookingsTable({ bookings, title = 'All Bookings' }) {
  const router = useRouter();
  const [localBookings, setLocalBookings] = useState(bookings);
  const [loadingId, setLoadingId] = useState(null);
  const [errorId, setErrorId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

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
        setLocalBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'CONFIRMED' } : b));
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

  return (
    <section className="glass-morphism" style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>{title} ({localBookings.length})</h2>
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
                        {b.userId ? (
                          <Link href={`/profile/${b.userId}`} style={{ fontWeight: '500', color: 'inherit', textDecoration: 'none' }}>{b.userName}</Link>
                        ) : (
                          <span style={{ fontWeight: '500' }}>{b.userName}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--muted)' }}>
                      {b.venueId ? (
                        <Link href={`/venue/${b.venueId}`} style={{ color: 'inherit', textDecoration: 'none' }}>{b.venueName}</Link>
                      ) : (
                        b.venueName
                      )}
                    </td>
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
  );
}
