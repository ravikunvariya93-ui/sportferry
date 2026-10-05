'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, ChevronDown, Bell, Search, Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import styles from './HomeHero.module.css';

const CITY_KEY = 'sportferry_city';

export default function HomeHero() {
  const { data: session } = useSession();
  const [city, setCity] = useState(null);

  useEffect(() => {
    const read = () => localStorage.getItem(CITY_KEY);
    setCity(read());

    const onSet = (e) => setCity(e.detail?.city || read());
    const onReset = () => setCity(read());
    window.addEventListener('sportferry:citySet', onSet);
    window.addEventListener('sportferry:resetLocation', onReset);
    return () => {
      window.removeEventListener('sportferry:citySet', onSet);
      window.removeEventListener('sportferry:resetLocation', onReset);
    };
  }, []);

  const openLocation = () => {
    window.dispatchEvent(new Event('sportferry:resetLocation'));
  };

  return (
    <section className={styles.hero}>
      <div className={styles.topBar}>
        <div className={styles.topActions}>
          <button className={styles.locationPill} onClick={openLocation}>
            <MapPin size={14} />
            <span>{city || 'Your City'}</span>
            <ChevronDown size={14} />
          </button>
          <button className={styles.iconBtn} aria-label="Notifications">
            <Bell size={18} />
            <span className={styles.dot} />
          </button>
          <Link href={session ? '/profile' : '/login'} className={styles.avatar}>
            {session?.user?.name?.charAt(0) || 'S'}
          </Link>
        </div>
      </div>

      <div className={styles.heroBody}>
        <h1 className={styles.headline}>
          Don&apos;t have a team?
          <br />
          <span className={styles.accent}>No problem.</span>
        </h1>
        <p className={styles.subtext}>Find players. Join a game. Play Box Cricket.</p>
        <div className={styles.ctaRow}>
          <Link href="/explore" className={styles.ctaPrimary}>
            <Search size={16} /> Find a Game
          </Link>
          <Link href="/register" className={styles.ctaSecondary}>
            <Plus size={16} /> Create a Game
          </Link>
        </div>
      </div>
    </section>
  );
}
