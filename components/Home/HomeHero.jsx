'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Building } from 'lucide-react';
import Link from 'next/link';
import styles from '@/app/page.module.css';

const CITY_KEY = 'sportferry_city';

export default function HomeHero() {
  const [hasCity, setHasCity] = useState(true); // optimistic: hide until we know

  useEffect(() => {
    // Check localStorage on mount
    setHasCity(!!localStorage.getItem(CITY_KEY));

    const onSet = () => setHasCity(true);
    const onReset = () => setHasCity(false);

    window.addEventListener('sportferry:citySet', onSet);
    window.addEventListener('sportferry:resetLocation', onReset);
    return () => {
      window.removeEventListener('sportferry:citySet', onSet);
      window.removeEventListener('sportferry:resetLocation', onReset);
    };
  }, []);

  if (hasCity) return null;

  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>
          Your Game, <span style={{ color: 'var(--primary)' }}>Your Ground.</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Book the best sports venues in your city in seconds. From box cricket to football turfs, we've got it all perfectly mapped out for you.
        </p>
        <div className={styles.heroButtons}>
          <Link href="/" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 28px', fontWeight: '600', borderRadius: '12px' }}>
            Book a Court Now <ArrowRight size={20} />
          </Link>
          <Link href="/register" style={{
            background: 'rgba(255,255,255,0.8)', color: 'var(--foreground)',
            padding: '14px 28px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)',
            cursor: 'pointer', fontWeight: '600',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.3s ease', backdropFilter: 'blur(12px)',
          }}>
            <Building size={20} /> Register as Vendor
          </Link>
        </div>
      </div>
    </section>
  );
}
