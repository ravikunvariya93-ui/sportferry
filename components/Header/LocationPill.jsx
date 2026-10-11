'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import styles from './LocationPill.module.css';

const CITY_KEY = 'sportferry_city';

export default function LocationPill() {
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

  return (
    <button
      className={styles.pill}
      onClick={() => window.dispatchEvent(new Event('sportferry:resetLocation'))}
      aria-label="Choose your city"
    >
      <MapPin size={14} className={styles.pin} />
      <span className={styles.label}>{city || 'Select your city'}</span>
      <ChevronDown size={13} className={styles.chevron} />
    </button>
  );
}
