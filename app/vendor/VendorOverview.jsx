'use client';

import React, { useState } from 'react';
import {
  TrendingUp, CalendarDays, IndianRupee, Percent, Plus, Building2,
  Wallet, Lock, Info, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import OfflineBookingModal from './OfflineBookingModal';

function Kpi({ label, value, sub, Icon, color }) {
  return (
    <div className="glass-morphism" style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        <Icon size={22} />
      </div>
      <div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>{value}</div>
        {sub && <div style={{ fontSize: '11.5px', color, fontWeight: 600, marginTop: '2px' }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function VendorOverview({ venues, kpis, earnings, sourceSplit, trend }) {
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const totalSource = Math.max(1, sourceSplit.online + sourceSplit.offline);
  const onlinePct = Math.round((sourceSplit.online / totalSource) * 100);
  const maxTrend = Math.max(1, ...trend.map(d => d.online + d.offline));

  return (
    <>
      {showOfflineModal && <OfflineBookingModal venues={venues} onClose={() => setShowOfflineModal(false)} />}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.5px' }}>Dashboard</h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>Here&apos;s how your venues are performing.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowOfflineModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: 600, background: 'var(--secondary)', border: '1px solid var(--glass-border)', color: 'var(--foreground)', cursor: 'pointer' }}
          >
            <Lock size={18} /> Add Offline Booking
          </button>
          <Link href="/vendor/calendar" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: 600, textDecoration: 'none' }}>
            <CalendarDays size={18} /> Open Calendar
          </Link>
        </div>
      </header>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
        <Kpi label="Total Bookings" value={kpis.totalBookings} Icon={CalendarDays} color="#38bdf8" />
        <Kpi label="Players" value={kpis.players} Icon={TrendingUp} color="#8b5cf6" />
        <Kpi label={`Net Earnings (after ${earnings.commissionPercent}%)`} value={`₹${earnings.net.toLocaleString('en-IN')}`} Icon={IndianRupee} color="#10b981" />
        <Kpi label="Occupancy" value={`${kpis.occupancy}%`} Icon={Percent} color="#f59e0b" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(240px, 1fr)', gap: '20px' }} className="responsive-grid-1">
        <section className="glass-morphism" style={{ padding: '22px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Bookings Trend</h2>
          <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '18px' }}>Last 14 days</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px' }}>
            {trend.map((d, i) => {
              const total = d.online + d.offline;
              const h = Math.round((total / maxTrend) * 120);
              const onlineH = total ? Math.round((d.online / total) * h) : 0;
              return (
                <div key={i} title={`${d.label}: ${d.online} online, ${d.offline} offline`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '120px', gap: '2px' }}>
                  {onlineH > 0 && <div style={{ height: `${onlineH}px`, background: 'var(--primary)', borderRadius: '4px 4px 0 0' }} />}
                  {h - onlineH > 0 && <div style={{ height: `${Math.max(2, h - onlineH)}px`, background: '#3b82f6', borderRadius: onlineH ? '0 0 4px 4px' : '4px' }} />}
                  {h === 0 && <div style={{ height: '3px', background: 'var(--glass-border)', borderRadius: '4px' }} />}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '14px', fontSize: '12px', color: 'var(--muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--primary)' }} /> Online</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#3b82f6' }} /> Offline</span>
          </div>
        </section>

        <section className="glass-morphism" style={{ padding: '22px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px', alignSelf: 'flex-start' }}>Booking Source</h2>
          <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '18px', alignSelf: 'flex-start' }}>Online vs offline</p>
          <div style={{
            width: '140px', height: '140px', borderRadius: '50%',
            background: `conic-gradient(var(--primary) 0 ${onlinePct}%, #3b82f6 ${onlinePct}% 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: '92px', height: '92px', borderRadius: '50%', background: 'var(--card-bg, #fff)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '20px', fontWeight: 800 }}>{sourceSplit.online + sourceSplit.offline}</span>
              <span style={{ fontSize: '10.5px', color: 'var(--muted)' }}>bookings</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '18px', marginTop: '18px', fontSize: '12px' }}>
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Online {sourceSplit.online}</span>
            <span style={{ color: '#3b82f6', fontWeight: 700 }}>Offline {sourceSplit.offline}</span>
          </div>
        </section>
      </div>

      {/* Quick actions */}
      <section className="glass-morphism" style={{ padding: '22px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          {[
            { href: '/vendor/grounds', label: 'Add / Manage Venues', Icon: Building2 },
            { href: '/vendor/grounds', label: 'Manage Turfs & Courts', Icon: Plus },
            { href: '/vendor/pricing', label: 'Pricing & Rules', Icon: IndianRupee },
            { href: '/vendor/earnings', label: 'View Payouts', Icon: Wallet },
          ].map(({ href, label, Icon }) => (
            <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: '12px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', textDecoration: 'none', color: 'inherit', fontWeight: 600, fontSize: '13.5px' }}>
              <Icon size={18} color="var(--primary)" /> {label}
            </Link>
          ))}
        </div>
      </section>

      {/* Guidelines (collapsible) */}
      <section>
        <button
          onClick={() => setShowInstructions(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit' }}
        >
          <Info size={15} /> Vendor guidelines {showInstructions ? '▾' : '▸'}
        </button>
        {showInstructions && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginTop: '12px' }}>
            {[
              { Icon: Wallet, color: '#10b981', title: `Commission: ${earnings.commissionPercent}%`, text: `Sportferry deducts ${earnings.commissionPercent}% from each confirmed booking.` },
              { Icon: AlertTriangle, color: '#f59e0b', title: 'No Cancellation', text: 'Vendors cannot cancel bookings. Contact admin if needed.' },
              { Icon: CheckCircle2, color: '#22c55e', title: 'Auto-Confirm', text: 'A turf confirms once it holds 6 players in total.' },
              { Icon: CalendarDays, color: '#8b5cf6', title: 'Monthly Withdrawal', text: 'Request one withdrawal per month from Payouts.' },
            ].map(({ Icon, color, title, text }) => (
              <div key={title} style={{ padding: '14px', background: 'var(--secondary)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Icon size={15} color={color} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color }}>{title}</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>{text}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
