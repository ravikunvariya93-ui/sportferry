'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import styles from './HomeHero.module.css';

export default function HomeHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroBody}>
        <h1 className={styles.headline}>
          Don&apos;t have a team?
          <br />
          <span className={styles.accent}>No problem.</span>
        </h1>
        <p className={styles.subtext}>Book a box cricket turf and play with players near you.</p>
        <div className={styles.ctaRow}>
          <Link href="/explore" className={styles.ctaPrimary}>
            <Search size={16} /> Find a Ground
          </Link>
          <Link href="/register" className={styles.ctaSecondary}>
            <Plus size={16} /> Create a Game
          </Link>
        </div>
      </div>
    </section>
  );
}
