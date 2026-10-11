import React from 'react';
import Link from 'next/link';
import { Zap, Calendar, Users, Trophy } from 'lucide-react';

const ACTIONS = [
  { Icon: Zap, color: '#f97316', bg: 'rgba(249,115,22,0.12)', title: 'Play Now', desc: 'Games within 2 hours', href: '/play-now' },
  { Icon: Calendar, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', title: 'Book Ground', desc: 'Book your favourite venue', href: '/explore' },
  { Icon: Users, color: '#22c55e', bg: 'rgba(34,197,94,0.12)', title: 'Find Players', desc: "We'll match you with players", href: '/players' },
  { Icon: Trophy, color: '#eab308', bg: 'rgba(234,179,8,0.12)', title: 'Tournaments', desc: 'Upcoming events & leagues', href: '/tournaments' },
];

export default function QuickActions() {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
      {ACTIONS.map(({ Icon, color, bg, title, desc, href }) => (
        <Link
          key={title}
          href={href}
          style={{
            background: 'var(--secondary)',
            border: '1px solid var(--glass-border)',
            borderRadius: '16px',
            padding: '14px 4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'inherit',
            textAlign: 'center',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          <span style={{ width: 40, height: 40, borderRadius: 12, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={20} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{title}</span>
            <span style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.35 }}>{desc}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}
