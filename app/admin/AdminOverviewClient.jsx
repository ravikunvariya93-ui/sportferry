'use client';

import React from 'react';
import {
  Users, Building2, CalendarCheck, TrendingUp,
  BarChart3, Activity, Clock, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import styles from './admin.module.css';

const STATUS_DOT = {
  CONFIRMED: '#22c55e',
  PENDING: '#fbbf24',
  CANCELLED: '#f87171',
};

const STATUS_BADGE = {
  CONFIRMED: styles.badgeConfirmed,
  PENDING: styles.badgePending,
  CANCELLED: styles.badgeCancelled,
};

export default function AdminOverviewClient({ stats }) {
  const {
    totalUsers, totalVendors, totalVenues, totalBookings,
    confirmedBookings, pendingBookings, cancelledBookings,
    totalRevenue, bookingsToday, newUsersThisMonth,
    recentBookings, topVenues, monthlyBookings,
  } = stats;

  const STAT_CARDS = [
    {
      label: 'Total Users',
      value: totalUsers,
      sub: `+${newUsersThisMonth} this month`,
      Icon: Users,
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.12)',
    },
    {
      label: 'Vendors',
      value: totalVendors,
      sub: 'Active vendors',
      Icon: Building2,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
    },
    {
      label: 'Total Venues',
      value: totalVenues,
      sub: 'Registered venues',
      Icon: Building2,
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.12)',
    },
    {
      label: 'Total Bookings',
      value: totalBookings,
      sub: `${bookingsToday} today`,
      Icon: CalendarCheck,
      color: '#06b6d4',
      bg: 'rgba(6,182,212,0.12)',
    },
    {
      label: 'Revenue',
      value: `₹${totalRevenue.toLocaleString('en-IN')}`,
      sub: 'From confirmed bookings',
      Icon: TrendingUp,
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.12)',
    },
    {
      label: 'Confirmed',
      value: confirmedBookings,
      sub: 'Booking approvals',
      Icon: CheckCircle2,
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.12)',
    },
    {
      label: 'Pending',
      value: pendingBookings,
      sub: 'Awaiting action',
      Icon: AlertCircle,
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.12)',
    },
    {
      label: 'Cancelled',
      value: cancelledBookings,
      sub: 'Total cancellations',
      Icon: XCircle,
      color: '#f87171',
      bg: 'rgba(239,68,68,0.12)',
    },
  ];

  // Build bar chart — ensure 6 months shown
  const maxCount = Math.max(...(monthlyBookings.map((m) => m.count)), 1);

  return (
    <div>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Platform Overview</h1>
        <p className={styles.pageSubtitle}>Real-time metrics across the entire Sportferry platform.</p>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        {STAT_CARDS.map((s) => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statIconWrap} style={{ background: s.bg, color: s.color }}>
              <s.Icon size={22} />
            </div>
            <div>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statSub}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Activity */}
      <div className={styles.overviewGrid}>

        {/* Monthly Bookings Bar Chart */}
        <div className={styles.sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <BarChart3 size={18} color="#22c55e" />
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Monthly Bookings</h2>
          </div>
          {monthlyBookings.length === 0 ? (
            <div className={styles.emptyState}>No data yet</div>
          ) : (
            <div className={styles.chartRow}>
              {monthlyBookings.map((m) => (
                <div key={m.label} className={styles.chartBar}>
                  <div
                    className={styles.chartBarFill}
                    style={{ height: `${Math.round((m.count / maxCount) * 90)}%` }}
                    title={`${m.count} bookings`}
                  />
                  <div className={styles.chartBarLabel}>{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Venues */}
        <div className={styles.sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <TrendingUp size={18} color="#22c55e" />
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Top Venues</h2>
          </div>
          {topVenues.length === 0 ? (
            <div className={styles.emptyState}>No booking data yet</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Venue</th>
                    <th>Bookings</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topVenues.map((v, i) => (
                    <tr key={v.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '2px' }}>
                          {i + 1}. {v.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{v.city}</div>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles.badgeConfirmed}`}>{v.count}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#22c55e' }}>
                        ₹{v.revenue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Activity size={18} color="#22c55e" />
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Recent Bookings</h2>
        </div>
        {recentBookings.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            No bookings yet on the platform
          </div>
        ) : (
          <div>
            {recentBookings.map((b) => (
              <div key={b.id} className={styles.activityItem}>
                <div
                  className={styles.activityDot}
                  style={{ background: STATUS_DOT[b.status] || '#64748b' }}
                />
                <div className={styles.userAvatar}>
                  {b.userName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
                    {b.userName}
                    <span style={{ color: '#64748b', fontWeight: 400 }}> booked </span>
                    {b.venueName}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{b.venueCity}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className={`${styles.badge} ${STATUS_BADGE[b.status] || styles.badgeUser}`}>
                    {b.status}
                  </span>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{b.dateStr}</div>
                </div>
                <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '13px', flexShrink: 0, marginLeft: '8px' }}>
                  ₹{b.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
