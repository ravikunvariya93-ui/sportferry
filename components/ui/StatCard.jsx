import React from 'react';
import Link from 'next/link';
import styles from './ui.module.css';

export default function StatCard({ label, value, color = 'var(--foreground)', Icon, sub, href }) {
  const content = (
    <>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={{ color }}>{value}</div>
      {sub && <div className={styles.statLabel} style={{ marginTop: 6, marginBottom: 0 }}>{sub}</div>}
    </>
  );
  const className = `glass-morphism ${styles.statCard}`;
  return href
    ? <Link href={href} style={{ textDecoration: 'none' }} className={className}>{content}</Link>
    : <div className={className}>{content}</div>;
}
