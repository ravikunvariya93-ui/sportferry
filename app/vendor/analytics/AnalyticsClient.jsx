'use client';

import React from 'react';
import { TrendingUp, Percent, IndianRupee, CalendarCheck } from 'lucide-react';
import { bookingTypeBreakdown } from '@/lib/adminStats';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function money(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}`; }

export default function AnalyticsClient({ bookings, kpis, earnings, trend }) {
  const breakdown = bookingTypeBreakdown(bookings.map(b => ({ classification: b.classification, bookingType: b.bookingType })));
  const dow = DAYS.map(() => 0);
  for (const b of bookings) {
    if (b.date) dow[new Date(b.date).getUTCDay()] += 1;
  }
  const maxDow = Math.max(1, ...dow);
  const t = breakdown;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.5px' }}>Analytics</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Revenue, occupancy and booking mix across your venues.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '16px' }}>
        {[
          [CalendarCheck, 'Total Bookings', kpis.totalBookings, '#38bdf8'],
          [IndianRupee, 'Net Earnings', money(earnings.net), '#22c55e'],
          [Percent, 'Occupancy', `${kpis.occupancy}%`, '#f59e0b'],
          [TrendingUp, 'Players', kpis.players, '#8b5cf6'],
        ].map(([Icon, label, value, color]) => (
          <div key={label} className="glass-morphism" style={{ padding: '20px' }}>
            <Icon size={18} color={color} />
            <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '10px' }}>{value}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(230px,1fr)', gap: '18px' }} className="responsive-grid-1">
        <section className="glass-morphism" style={{ padding: '22px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Bookings by day of week</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '150px' }}>
            {DAYS.map((d, i) => (
              <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{dow[i]}</span>
                <div style={{ width: '100%', height: `${Math.round((dow[i] / maxDow) * 100)}px`, minHeight: '4px', background: 'linear-gradient(180deg,var(--accent),var(--primary))', borderRadius: '6px 6px 0 0' }} />
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-morphism" style={{ padding: '22px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Booking mix</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            <div style={{ width: '110px', height: '110px', borderRadius: '50%', flexShrink: 0, background: `conic-gradient(var(--primary) 0 ${t.solo.pct}%, #3b82f6 ${t.solo.pct}% ${t.solo.pct + t.team.pct}%, #8b5cf6 ${t.solo.pct + t.team.pct}% ${t.solo.pct + t.team.pct + t.group.pct}%, #f59e0b ${t.solo.pct + t.team.pct + t.group.pct}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--card-bg, #fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{t.total}</div>
            </div>
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[['Solo', t.solo], ['Team', t.team], ['Group', t.group], ['Offline', t.offline]].map(([label, v]) => (
                <div key={label}>{label}: <strong>{v.count} ({v.pct}%)</strong></div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="glass-morphism" style={{ padding: '22px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Last 14 days</h2>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '90px' }}>
          {trend.map((d, i) => {
            const total = d.online + d.offline;
            const max = Math.max(1, ...trend.map(x => x.online + x.offline));
            return <div key={i} title={`${d.label}: ${total}`} style={{ flex: 1, height: `${Math.max(3, (total / max) * 80)}px`, background: total ? 'var(--primary)' : 'var(--glass-border)', borderRadius: '4px 4px 0 0' }} />;
          })}
        </div>
      </section>
    </div>
  );
}
