'use client';

import React from 'react';
import Link from 'next/link';
import { User, Users, Trophy, ArrowRight } from 'lucide-react';
import styles from './HomeHero.module.css';

const MODES = [
  { key: 'SOLO', Icon: User, title: 'Solo (1–2 players)', desc: 'Join as an individual or pair', color: '#16a34a', bg: 'rgba(34,197,94,0.16)' },
  { key: 'TEAM', Icon: Users, title: 'Team (3–6 players)', desc: 'Book with your team', color: '#2563eb', bg: 'rgba(59,130,246,0.16)' },
  { key: 'GROUP', Icon: Trophy, title: 'Group (12 players)', desc: 'Book the full turf (private game)', color: '#ea580c', bg: 'rgba(249,115,22,0.16)' },
];

export default function HomeHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroBody}>
        <h1 className={styles.headline}>
          Don&apos;t have a team?
          <br />
          <span className={styles.accent}>Play with real players near you!</span>
        </h1>
        <p className={styles.subtext}>Join or create a game and get matched with players at your convenient time.</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', maxWidth: '420px' }}>
          <Link href="/play-now" className={styles.ctaPrimary} style={{ flex: '0 0 auto' }}>
            Play Now <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '22px' }}>
        {MODES.map(({ key, Icon, title, desc, color, bg }) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '14px',
            background: 'rgba(255,255,255,0.94)', color: '#0f172a',
            border: `1px solid ${color}55`,
          }}>
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={19} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '14px', fontWeight: 800 }}>{title}</span>
              <span style={{ display: 'block', fontSize: '11px', color: '#64748b', lineHeight: 1.3 }}>{desc}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
