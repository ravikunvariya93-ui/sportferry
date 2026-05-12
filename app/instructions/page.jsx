'use client';

import React, { useState } from 'react';
import { Users, Building2, Shield, Clock, CreditCard, AlertTriangle, CheckCircle, Wallet, Info, Zap } from 'lucide-react';

const TABS = [
  { key: 'players', label: 'For Players', Icon: Users },
  { key: 'vendors', label: 'For Vendors', Icon: Building2 },
];

export default function InstructionsPage() {
  const [activeTab, setActiveTab] = useState('players');

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ display: 'inline-flex', padding: '10px', background: 'rgba(22,163,74,0.1)', borderRadius: '16px', marginBottom: '16px' }}>
          <Info size={32} color="var(--primary)" />
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '8px' }}>Platform Guidelines</h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px' }}>Everything you need to know about using SportFerry</p>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--secondary)', borderRadius: '14px', padding: '4px', marginBottom: '40px' }}>
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              flex: 1, padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700',
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: activeTab === key ? 'var(--primary)' : 'transparent',
              color: activeTab === key ? 'white' : 'var(--foreground)',
              border: 'none',
            }}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </div>

      {/* Player Instructions */}
      {activeTab === 'players' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <InstructionCard icon={<Zap size={22} color="#22c55e" />} title="How Booking Works" color="#22c55e">
            <ul>
              <li>Browse venues and select your preferred date and time slot(s).</li>
              <li>Choose your booking type: <strong>Solo</strong> (1-2 players), <strong>Team</strong> (3-6 players), or <strong>Group</strong> (full 12 players).</li>
              <li>You can select <strong>multiple time slots</strong> in a single booking.</li>
              <li>Your booking stays <strong>PENDING</strong> until both teams have at least <strong>3 players each</strong>, then it auto-confirms.</li>
            </ul>
          </InstructionCard>

          <InstructionCard icon={<Shield size={22} color="#3b82f6" />} title="Cancellation Policy" color="#3b82f6">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {[
                { window: '24+ hours before', refund: '100%', color: '#22c55e', icon: '✅' },
                { window: '12-24 hours before', refund: '50%', color: '#f59e0b', icon: '⚠️' },
                { window: 'Under 12 hours', refund: '0%', color: '#ef4444', icon: '❌' },
                { window: 'After slot starts', refund: 'Blocked', color: '#64748b', icon: '🚫' },
              ].map(tier => (
                <div key={tier.window} style={{ padding: '16px', background: 'var(--secondary)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>{tier.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: tier.color, marginBottom: '4px' }}>{tier.refund} Refund</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{tier.window}</div>
                </div>
              ))}
            </div>
          </InstructionCard>

          <InstructionCard icon={<CheckCircle size={22} color="#10b981" />} title="Rules & Etiquette" color="#10b981">
            <ul>
              <li>Wear <strong>non-marking shoes</strong> only on the turf.</li>
              <li>Arrive at least 10 minutes before your slot time.</li>
              <li>Respect fellow players and venue staff.</li>
              <li>No food or drinks on the playing surface.</li>
              <li>Report any equipment damage to the venue immediately.</li>
            </ul>
          </InstructionCard>

          <InstructionCard icon={<CreditCard size={22} color="#8b5cf6" />} title="Payment & Refunds" color="#8b5cf6">
            <ul>
              <li>All payments are processed securely online.</li>
              <li>Refunds are credited within <strong>5-7 business days</strong> to your original payment method.</li>
              <li>Group bookings (12 players) require full slot payment.</li>
            </ul>
          </InstructionCard>
        </div>
      )}

      {/* Vendor Instructions */}
      {activeTab === 'vendors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <InstructionCard icon={<Wallet size={22} color="#10b981" />} title="Commission Structure" color="#10b981">
            <ul>
              <li>SportFerry charges a <strong>12% platform commission</strong> on every confirmed online booking.</li>
              <li>You receive <strong>88%</strong> of the booking amount.</li>
              <li>Offline bookings (walk-ins) are not charged commission.</li>
              <li>Commission is automatically deducted — no manual action needed.</li>
            </ul>
          </InstructionCard>

          <InstructionCard icon={<AlertTriangle size={22} color="#f59e0b" />} title="Cancellation Policy (Vendors)" color="#f59e0b">
            <ul>
              <li><strong>Vendors cannot cancel bookings.</strong> This ensures trust and reliability for players.</li>
              <li>If an emergency occurs, contact the <strong>admin team</strong> for assistance.</li>
              <li>Admin-initiated cancellations give players a 100% refund.</li>
            </ul>
          </InstructionCard>

          <InstructionCard icon={<Clock size={22} color="#3b82f6" />} title="Booking Auto-Confirmation" color="#3b82f6">
            <ul>
              <li>Player bookings start as <strong>PENDING</strong>.</li>
              <li>Once both teams in a slot have at least <strong>3 players each</strong>, all bookings in that slot are automatically confirmed.</li>
              <li>You can also manually approve pending bookings from your dashboard.</li>
            </ul>
          </InstructionCard>

          <InstructionCard icon={<CreditCard size={22} color="#8b5cf6" />} title="Monthly Withdrawals" color="#8b5cf6">
            <ul>
              <li>You can request <strong>one withdrawal per month</strong> from your dashboard.</li>
              <li>Withdrawal amount = Total confirmed earnings − 12% commission − previously withdrawn amounts.</li>
              <li>Admin reviews and processes withdrawal requests.</li>
              <li>Payouts are typically completed within <strong>7-10 business days</strong>.</li>
            </ul>
          </InstructionCard>

          <InstructionCard icon={<Building2 size={22} color="#06b6d4" />} title="Venue Management" color="#06b6d4">
            <ul>
              <li>Keep your venue details up to date (photos, amenities, pricing).</li>
              <li>Use the <strong>Offline Booking</strong> feature for walk-in customers to block slots.</li>
              <li>Monitor your dashboard for booking activity and earnings.</li>
            </ul>
          </InstructionCard>
        </div>
      )}
    </div>
  );
}

function InstructionCard({ icon, title, color, children }) {
  return (
    <div className="glass-morphism" style={{ padding: '28px', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ padding: '8px', background: `${color}15`, borderRadius: '10px' }}>{icon}</div>
        <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{title}</h3>
      </div>
      <div style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: '1.8' }}>
        {children}
      </div>
      <style jsx>{`
        ul { margin: 0; padding-left: 20px; }
        li { margin-bottom: 8px; }
        li:last-child { margin-bottom: 0; }
      `}</style>
    </div>
  );
}
