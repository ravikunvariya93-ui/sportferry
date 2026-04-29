import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Cancellation Policy | Sportferry',
  description: 'Understand our fair and transparent cancellation and refund policy for sport venue bookings on Sportferry.',
};

export default function CancellationPolicyPage() {
  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '36px' }}>
      {/* Header */}
      <header>
        <h1 style={{ fontSize: '34px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '10px' }}>
          Cancellation &amp; Refund Policy
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: '1.6' }}>
          We believe in fairness for both players and venue owners. Our time-based policy ensures 
          everyone is treated equitably.
        </p>
      </header>

      {/* Player Policy */}
      <section className="glass-morphism" style={{ padding: '28px', borderRadius: '18px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🏏 For Players
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
          Your refund depends on how far in advance you cancel before the slot starts.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Tier 1 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '18px 20px', borderRadius: '14px',
            background: 'rgba(22,163,74,0.06)',
            border: '1px solid rgba(22,163,74,0.15)',
          }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>✅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>
                24+ hours before the slot
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Cancel worry-free. Full amount returned to your original payment method.
              </div>
            </div>
            <div style={{ fontWeight: '800', fontSize: '20px', color: '#16a34a', flexShrink: 0 }}>
              100%
            </div>
          </div>

          {/* Tier 2 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '18px 20px', borderRadius: '14px',
            background: 'rgba(251,191,36,0.06)',
            border: '1px solid rgba(251,191,36,0.15)',
          }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>
                12 – 24 hours before the slot
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Late cancellations are partially refundable. Half the amount is retained by the venue.
              </div>
            </div>
            <div style={{ fontWeight: '800', fontSize: '20px', color: '#d97706', flexShrink: 0 }}>
              50%
            </div>
          </div>

          {/* Tier 3 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '18px 20px', borderRadius: '14px',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.15)',
          }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>❌</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>
                Less than 12 hours before the slot
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Very late cancellations are non-refundable. The venue has already reserved resources for your game.
              </div>
            </div>
            <div style={{ fontWeight: '800', fontSize: '20px', color: '#dc2626', flexShrink: 0 }}>
              0%
            </div>
          </div>

          {/* Tier 4 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '18px 20px', borderRadius: '14px',
            background: 'rgba(100,116,139,0.06)',
            border: '1px solid rgba(100,116,139,0.15)',
          }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>🚫</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>
                After the slot has started
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Bookings cannot be cancelled once the game time has begun.
              </div>
            </div>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#64748b', flexShrink: 0 }}>
              BLOCKED
            </div>
          </div>
        </div>
      </section>

      {/* Vendor Policy */}
      <section className="glass-morphism" style={{ padding: '28px', borderRadius: '18px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🏢 For Venue Owners
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
          Venue owners can cancel bookings, but players are always protected.
        </p>

        <div style={{
          padding: '18px 20px', borderRadius: '14px',
          background: 'rgba(56,189,248,0.06)',
          border: '1px solid rgba(56,189,248,0.15)',
          marginBottom: '14px',
        }}>
          <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '8px' }}>
            ⚡ Full Refund Guaranteed
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.7' }}>
            When a venue owner cancels a booking for any reason (maintenance, weather, emergencies, etc.),
            the player <strong style={{ color: '#16a34a' }}>always receives a 100% full refund</strong> — regardless
            of how close the cancellation is to the slot time.
          </div>
        </div>

        <div style={{
          padding: '18px 20px', borderRadius: '14px',
          background: 'var(--secondary)',
          border: '1px solid var(--glass-border)',
        }}>
          <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '8px' }}>
            📋 Reason Required
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.7' }}>
            Venue owners must provide a valid reason when cancelling a player&apos;s booking. This ensures 
            transparency and accountability. Common reasons include:
          </div>
          <ul style={{ margin: '10px 0 0 0', padding: '0 0 0 20px', fontSize: '13px', color: 'var(--muted)', lineHeight: '1.8' }}>
            <li>Venue maintenance or repairs</li>
            <li>Adverse weather conditions</li>
            <li>Emergency closure</li>
            <li>Equipment unavailability</li>
            <li>Double-booking resolution</li>
          </ul>
        </div>
      </section>

      {/* General Terms */}
      <section className="glass-morphism" style={{ padding: '28px', borderRadius: '18px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          📜 General Terms
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--muted)', lineHeight: '1.7' }}>
          <div style={{ padding: '12px 16px', background: 'var(--secondary)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
            <strong style={{ color: 'var(--foreground)' }}>Refund Processing:</strong> Approved refunds are processed 
            within 5–7 business days to the original payment method.
          </div>
          <div style={{ padding: '12px 16px', background: 'var(--secondary)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
            <strong style={{ color: 'var(--foreground)' }}>Offline Bookings:</strong> Walk-in / offline bookings 
            do not involve online payments and are not eligible for monetary refunds through the platform.
          </div>
          <div style={{ padding: '12px 16px', background: 'var(--secondary)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
            <strong style={{ color: 'var(--foreground)' }}>Disputes:</strong> If you believe a cancellation was 
            unfair, contact our support team and we will review the case within 24 hours.
          </div>
          <div style={{ padding: '12px 16px', background: 'var(--secondary)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
            <strong style={{ color: 'var(--foreground)' }}>No-Shows:</strong> Failing to show up for a confirmed 
            booking is treated the same as a &lt;12 hour cancellation — no refund.
          </div>
        </div>
      </section>

      {/* Back link */}
      <div style={{ textAlign: 'center', paddingBottom: '20px' }}>
        <Link
          href="/bookings"
          className="btn-primary"
          style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '12px', fontWeight: '600' }}
        >
          ← Back to My Bookings
        </Link>
      </div>
    </div>
  );
}
