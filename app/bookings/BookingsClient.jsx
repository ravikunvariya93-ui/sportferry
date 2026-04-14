'use client';

import React, { useState } from 'react';
import { Calendar, MapPin, Clock, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const STATUS_STYLES = {
  CONFIRMED: { bg: 'rgba(22,163,74,0.1)',  color: '#16a34a', label: 'Confirmed',  border: 'var(--primary)' },
  PENDING:   { bg: 'rgba(251,191,36,0.1)', color: '#d97706', label: 'Pending',    border: '#d97706' },
  CANCELLED: { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', label: 'Cancelled',  border: '#cbd5e1' },
};

export default function BookingsClient({ initialBookings }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [confirmingId, setConfirmingId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [errorMap, setErrorMap] = useState({});

  const handleCancel = async (bookingId) => {
    setLoadingId(bookingId);
    setErrorMap(prev => ({ ...prev, [bookingId]: null }));
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: 'PATCH' });
      if (res.ok) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'CANCELLED' } : b));
        setConfirmingId(null);
      } else {
        const d = await res.json();
        setErrorMap(prev => ({ ...prev, [bookingId]: d.message || 'Cancellation failed.' }));
      }
    } catch {
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
      {bookings.map(booking => {
        const statusStyle = STATUS_STYLES[booking.status] || STATUS_STYLES.PENDING;
        const canCancel = booking.status !== 'CANCELLED';
        const isConfirming = confirmingId === booking.id;
        const isLoading = loadingId === booking.id;
        const errMsg = errorMap[booking.id];

        return (
          <div
            key={booking.id}
            className="glass-morphism"
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
            <div style={{ flex: 1, minWidth: '200px' }}>
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

              {/* Error message */}
              {errMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', color: '#dc2626', fontSize: '13px' }}>
                  <AlertCircle size={14} /> {errMsg}
                </div>
              )}
            </div>

            {/* Right: amount + action */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '22px', fontWeight: '800', marginBottom: '12px' }}>{booking.amount}</div>

              {canCancel && (
                isConfirming ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>Cancel this booking?</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => setConfirmingId(null)}
                        style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', color: 'var(--foreground)' }}
                      >
                        Keep
                      </button>
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={isLoading}
                        style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: '600', opacity: isLoading ? 0.7 : 1 }}
                      >
                        {isLoading ? 'Cancelling...' : 'Yes, Cancel'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingId(booking.id)}
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
