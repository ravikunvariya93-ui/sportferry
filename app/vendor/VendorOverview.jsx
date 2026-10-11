'use client';

import React, { useState } from 'react';
import {
  TrendingUp, Calendar, LayoutDashboard, Users, Lock,
  CheckCircle2, Info, Wallet, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import OfflineBookingModal from './OfflineBookingModal';

export default function VendorOverview({ venues, stats }) {
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  return (
    <>
      {showOfflineModal && <OfflineBookingModal venues={venues} onClose={() => setShowOfflineModal(false)} />}

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
          <Link
            href="/vendor/venues"
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }}
          >
            <LayoutDashboard size={18} /> Manage Venues
          </Link>
        </div>
      </header>

      {/* Vendor Instructions Banner */}
      {showInstructions && (
        <div style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(99,102,241,0.08))', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '16px', padding: '24px', position: 'relative' }}>
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

      {/* Stats — each links to its page */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
        {stats.map(stat => {
          const Icon = { TrendingUp, Calendar, LayoutDashboard, Users }[stat.iconName];
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="glass-morphism hover-card"
              style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '18px', textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${stat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>
                {Icon && <Icon size={22} />}
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>{stat.label}</div>
                <div style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>{stat.value}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
