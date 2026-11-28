'use client';

import React from 'react';
import { formatINR, formatNumber } from '@/lib/format';
import Link from 'next/link';
import {
  Users, Building2, CalendarCheck, TrendingUp, IndianRupee, Percent,
  BarChart3, Activity, Layers, UserCheck, Wallet, Tag, Settings, ShieldCheck,
} from 'lucide-react';
import styles from './admin.module.css';

const STATUS_DOT = { CONFIRMED: '#22c55e', PENDING: '#fbbf24', CANCELLED: '#f87171' };
const STATUS_BADGE = {
  CONFIRMED: styles.badgeConfirmed,
  PENDING: styles.badgePending,
  CANCELLED: styles.badgeCancelled,
};

export default function AdminOverviewClient({ stats }) {
  const {
    totalBookings, totalPlayers, grossBookingValue, commission, commissionPercent,
    totalTurfs, activeVenues, registeredUsers, fillRate, pendingVendors,
    trend, breakdown, topVenues, recentBookings,
  } = stats;

  const KPIS = [
    { label: 'Total Bookings', value: formatNumber(totalBookings), Icon: CalendarCheck, color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', href: '/admin/bookings' },
    { label: 'Total Players', value: formatNumber(totalPlayers), Icon: Users, color: '#6366f1', bg: 'rgba(99,102,241,0.12)', href: '/admin/users' },
    { label: 'Gross Booking Value', value: formatINR(grossBookingValue), Icon: TrendingUp, color: '#22c55e', bg: 'rgba(34,197,94,0.12)', href: '/admin/bookings?status=CONFIRMED' },
    { label: `Commission (${commissionPercent}%)`, value: formatINR(commission), Icon: IndianRupee, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', href: '/admin/payouts' },
  ];

  const PLATFORM = [
    { label: 'Active Venues', value: activeVenues, Icon: Building2, color: '#22c55e' },
    { label: 'Total Turfs', value: totalTurfs, Icon: Layers, color: '#06b6d4' },
    { label: 'Registered Users', value: formatNumber(registeredUsers), Icon: UserCheck, color: '#6366f1' },
    { label: 'Fill Rate', value: `${fillRate}%`, Icon: Percent, color: '#f59e0b' },
  ];

  const QUICK = [
    { label: 'Approve Vendors', sub: `${pendingVendors} pending`, href: '/admin/vendors?status=PENDING', Icon: ShieldCheck },
    { label: 'Manage Users', href: '/admin/users', Icon: Users },
    { label: 'View Payouts', href: '/admin/payouts', Icon: Wallet },
    { label: 'View Offers', href: '/admin/promotions', Icon: Tag },
    { label: 'System Settings', href: '/admin/settings', Icon: Settings },
  ];

  const maxTrend = Math.max(1, ...trend.map(t => t.online + t.offline));
  const t = breakdown;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Welcome back, Admin 👋</h1>
        <p className={styles.pageSubtitle}>Here&apos;s the overall performance of Sportferry.</p>
      </div>

      {/* KPIs */}
      <div className={styles.statsGrid}>
        {KPIS.map((s) => (
          <Link key={s.label} href={s.href} className={styles.statCard} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className={styles.statIconWrap} style={{ background: s.bg, color: s.color }}><s.Icon size={22} /></div>
            <div>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statValue}>{s.value}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className={styles.overviewGrid}>
        <div className={styles.sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <BarChart3 size={18} color="#22c55e" />
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Bookings Trend</h2>
            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: 'auto' }}>Last 30 days</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '130px' }}>
            {trend.map((d, i) => {
              const total = d.online + d.offline;
              const h = Math.round((total / maxTrend) * 110);
              const onlineH = total ? Math.round((d.online / total) * h) : 0;
              return (
                <div key={i} title={`${d.label}: ${d.online} online, ${d.offline} offline`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '110px', gap: '2px' }}>
                  {onlineH > 0 && <div style={{ height: `${onlineH}px`, background: '#22c55e', borderRadius: '3px 3px 0 0' }} />}
                  {h - onlineH > 0 && <div style={{ height: `${Math.max(2, h - onlineH)}px`, background: '#38bdf8', borderRadius: onlineH ? '0 0 3px 3px' : '3px' }} />}
                  {h === 0 && <div style={{ height: '3px', background: 'var(--admin-border)', borderRadius: '3px' }} />}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#22c55e' }} /> Sports Bookings</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#38bdf8' }} /> Offline Bookings</span>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Percent size={18} color="#22c55e" />
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Bookings by Type</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{
              width: '128px', height: '128px', borderRadius: '50%', flexShrink: 0,
              background: `conic-gradient(#22c55e 0 ${t.solo.pct}%, #0f172a ${t.solo.pct}% ${t.solo.pct + t.team.pct}%, #86efac ${t.solo.pct + t.team.pct}% ${t.solo.pct + t.team.pct + t.group.pct}%, #f59e0b ${t.solo.pct + t.team.pct + t.group.pct}% 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: '84px', height: '84px', borderRadius: '50%', background: 'var(--admin-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 800 }}>{t.total}</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>bookings</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              {[
                ['Solo Game', t.solo, '#22c55e'],
                ['Team Game', t.team, '#0f172a'],
                ['Group Booking', t.group, '#86efac'],
                ['Offline Booking', t.offline, '#f59e0b'],
              ].map(([label, v, color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                  <span style={{ color: 'var(--admin-text-sub)' }}>{label}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{v.count} ({v.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Platform overview */}
      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Platform Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
          {PLATFORM.map(({ label, value, Icon, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', border: '1px solid var(--admin-border)', borderRadius: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${color}1f`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{value}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px' }}>
          {QUICK.map(({ label, sub, href, Icon }) => (
            <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', border: '1px solid var(--admin-border)', borderRadius: '12px', textDecoration: 'none', color: 'inherit' }}>
              <Icon size={18} color="#22c55e" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{label}</div>
                {sub && <div style={{ fontSize: '11px', color: '#f59e0b' }}>{sub}</div>}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Top venues + recent */}
      <div className={styles.overviewGrid}>
        <div className={styles.sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <TrendingUp size={18} color="#22c55e" />
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Top Venues</h2>
          </div>
          {topVenues.length === 0 ? (
            <div className={styles.emptyState}>No booking data yet</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Venue</th><th>Bookings</th><th>Revenue</th></tr></thead>
                <tbody>
                  {topVenues.map((v, i) => (
                    <tr key={v.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--admin-text-main)' }}>{i + 1}. {v.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{v.city}</div>
                      </td>
                      <td><span className={`${styles.badge} ${styles.badgeConfirmed}`}>{v.count}</span></td>
                      <td style={{ fontWeight: 600, color: '#22c55e' }}>{formatINR(v.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Activity size={18} color="#22c55e" />
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Recent Bookings</h2>
          </div>
          {recentBookings.length === 0 ? (
            <div className={styles.emptyState}>No bookings yet</div>
          ) : (
            <div>
              {recentBookings.map((b) => (
                <div key={b.id} className={styles.activityItem}>
                  <div className={styles.activityDot} style={{ background: STATUS_DOT[b.status] || '#64748b' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
                      {b.userName} <span style={{ color: '#64748b', fontWeight: 400 }}>booked</span> {b.venueName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{b.venueCity}</div>
                  </div>
                  <span className={`${styles.badge} ${STATUS_BADGE[b.status] || styles.badgeUser}`}>{b.status}</span>
                  <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '13px', marginLeft: '10px', flexShrink: 0 }}>{formatINR(b.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
