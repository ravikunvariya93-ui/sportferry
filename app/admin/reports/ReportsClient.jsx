'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Download } from 'lucide-react';
import styles from '../admin.module.css';

function money(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}`; }

export default function ReportsClient() {
  const [bookings, setBookings] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/bookings?limit=100&tab=ALL').then(r => r.json()),
      fetch('/api/admin/venues?limit=100').then(r => r.json()),
    ]).then(([b, v]) => {
      setBookings(b.bookings || []); setVenues(v.venues || []); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const gross = bookings.filter(b => b.status === 'CONFIRMED').reduce((s, b) => s + (b.amount || 0), 0);
  const cityMap = {};
  venues.forEach(v => { cityMap[v.city] = (cityMap[v.city] || 0) + 1; });
  const cities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCity = Math.max(1, ...cities.map(c => c[1]));

  const download = (type) => { window.location.href = `/api/admin/reports?type=${type}`; };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BarChart3 size={28} color="#22c55e" />
          <div>
            <h1 className={styles.pageTitle}>Reports &amp; Analytics</h1>
            <p className={styles.pageSubtitle}>Platform performance and downloadable reports.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {[['bookings', 'Bookings CSV'], ['revenue', 'Revenue CSV'], ['venues', 'Venues CSV']].map(([type, label]) => (
          <button key={type} className={styles.pageBtn} onClick={() => download(type)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={15} /> {label}</button>
        ))}
        <a className={styles.pageBtn} href="/api/admin/payouts?format=csv" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={15} /> Settlement Report</a>
        <a className={styles.pageBtn} href="/api/admin/refunds?format=csv" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={15} /> Refund Report</a>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}>Loading reports…</div>
      ) : (
        <>
          <div className={styles.statsGrid}>
            {[['Bookings', bookings.length], ['Confirmed', bookings.filter(b => b.status === 'CONFIRMED').length], ['Gross (sample)', money(gross)], ['Venues', venues.length]].map(([label, value]) => (
              <div key={label} className={styles.statCard}><div><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div></div>
            ))}
          </div>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Venues by city</h2>
            <div className={styles.chartRow}>
              {cities.map(([city, count]) => (
                <div key={city} className={styles.chartBar}>
                  <div className={styles.chartBarFill} style={{ height: `${Math.round((count / maxCity) * 100)}%` }} title={`${count} venues`} />
                  <div className={styles.chartBarLabel}>{city}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
