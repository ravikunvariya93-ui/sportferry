import React from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Trophy, MapPin, Ticket, Clock, XCircle } from 'lucide-react';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { auth } from '@/lib/auth';
import { formatToAMPM } from '@/lib/ist';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Booking E-Ticket | Sportferry',
  description: 'View your Sportferry booking ticket.',
};

const STATUS_STYLES = {
  CONFIRMED: { label: 'Confirmed', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  PENDING: { label: 'Pending', color: '#d97706', bg: 'rgba(251,191,36,0.12)' },
  CANCELLED: { label: 'Cancelled', color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
};

export default async function BookingTicketPage({ params }) {
  await dbConnect();

  // The ticket shows the customer's name and email — only the customer, the
  // venue that hosts the game and an admin may see it.
  const session = await auth();
  if (!session?.user?.id) return notFound();

  let booking = null;
  try {
    booking = await Booking.findById(params.id)
      .populate('venue', 'name area city address owner')
      .populate('user', 'name email')
      .lean();
  } catch {
    booking = null; // malformed id
  }
  if (!booking || booking.status === 'PAYMENT_PENDING') return notFound();

  const isCustomer = booking.user?._id?.toString() === session.user.id;
  const isVenueOwner = booking.venue?.owner?.toString() === session.user.id;
  const isAdmin = session.user.role === 'ADMIN';
  if (!isCustomer && !isVenueOwner && !isAdmin) return notFound();

  const h = headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  const ticketUrl = `${proto}://${host}/bookings/${params.id}`;

  const status = STATUS_STYLES[booking.status] || STATUS_STYLES.PENDING;
  const isConfirmed = booking.status === 'CONFIRMED';
  const statusNote = booking.status === 'CONFIRMED'
    ? 'Your booking is confirmed.'
    : booking.status === 'CANCELLED'
    ? 'This booking was cancelled.'
    : 'Waiting for confirmation.';

  // The QR is the valid-ticket artifact — only issue it for a confirmed booking.
  const qrSvg = isConfirmed
    ? await QRCode.toString(ticketUrl, { type: 'svg', margin: 1, width: 220 })
    : null;
  const customerName = booking.user?.name || booking.offlineCustomerName || 'Walk-in';
  const customerEmail = booking.user?.email || '';
  const shortId = booking._id.toString().slice(-8).toUpperCase();
  const venuePlace = booking.venue ? `${booking.venue.area}, ${booking.venue.city}` : '';
  const isOffline = booking.bookingType === 'OFFLINE';

  const details = [
    { label: 'Date', value: new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) },
    { label: 'Time Slot', value: `${formatToAMPM(booking.startTime)} – ${formatToAMPM(booking.endTime)}` },
    { label: 'Sport', value: booking.sport },
    { label: 'Players', value: `${booking.playersCount} · ${booking.classification}${isOffline ? ' · Walk-in' : ''}` },
  ];

  return (
    <main style={{ maxWidth: '560px', margin: '32px auto', padding: '0 16px 64px' }}>
      <div className="glass-morphism" style={{ borderRadius: '24px', overflow: 'hidden', boxShadow: '0 18px 48px rgba(15,23,42,0.12)' }}>
        {/* Header band */}
        <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', padding: '24px', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '17px', letterSpacing: '-0.3px' }}>
              <Trophy size={20} /> Sportferry
            </div>
            <span style={{ fontSize: '12px', fontWeight: '700', background: 'rgba(255,255,255,0.22)', padding: '5px 12px', borderRadius: '100px', letterSpacing: '0.5px' }}>
              E-TICKET
            </span>
          </div>
          <div style={{ marginTop: '20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85 }}>
            Booking ID
          </div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '16px', fontWeight: '700', letterSpacing: '1.5px' }}>
            #{shortId}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 12px', borderRadius: '100px', background: status.bg, color: status.color }}>
              {status.label}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{statusNote}</span>
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.3px', marginBottom: '6px' }}>
            {booking.venue?.name || 'Venue'}
          </h1>
          {venuePlace && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
              <MapPin size={14} color="var(--primary)" /> {venuePlace}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            {details.map((d) => (
              <div key={d.label} style={{ background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{d.label}</div>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>{d.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--glass-border)', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Booked by</div>
              <div style={{ fontSize: '15px', fontWeight: '700' }}>{customerName}</div>
              {customerEmail && (
                <a href={`mailto:${customerEmail}`} style={{ display: 'block', fontSize: '13px', color: 'var(--primary)', textDecoration: 'none', marginTop: '2px' }}>{customerEmail}</a>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Amount</div>
              <div style={{ fontSize: '20px', fontWeight: '800' }}>₹{booking.totalAmount ?? 0}</div>
            </div>
          </div>
        </div>

        {/* Perforation */}
        <div style={{ position: 'relative', borderTop: '2px dashed var(--glass-border)', margin: '0 24px' }}>
          <div style={{ position: 'absolute', left: '-36px', top: '-11px', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--background)' }} />
          <div style={{ position: 'absolute', right: '-36px', top: '-11px', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--background)' }} />
        </div>

        {/* QR (only for confirmed bookings) */}
        <div style={{ padding: '24px', textAlign: 'center' }}>
          {isConfirmed ? (
            <>
              <div
                style={{ display: 'inline-block', background: 'white', padding: '12px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', color: 'var(--muted)', marginTop: '14px' }}>
                <Ticket size={14} /> Show this QR at the venue to check in
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px', opacity: 0.8 }}>
                Anyone with this link can view the booking details.
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px', borderRadius: '16px', background: status.bg, border: `1px solid ${status.color}33` }}>
              {booking.status === 'CANCELLED' ? <XCircle size={30} color={status.color} /> : <Clock size={30} color={status.color} />}
              <div style={{ fontWeight: '800', fontSize: '16px', color: status.color }}>{status.label}</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', maxWidth: '320px', lineHeight: 1.5 }}>
                {booking.status === 'CANCELLED'
                  ? 'This ticket and its QR code are no longer valid.'
                  : 'The QR code and check-in become available once this booking is confirmed.'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <Link href="/bookings" style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '14px', textDecoration: 'none' }}>
          ← Back to My Bookings
        </Link>
      </div>
    </main>
  );
}
