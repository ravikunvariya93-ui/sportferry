import React from 'react';
import Link from 'next/link';
import { Zap, Calendar, Users, Trophy } from 'lucide-react';

const ACTIONS = [
  { Icon: Zap, color: '#f97316', bg: 'rgba(249,115,22,0.14)', title: 'Play Now', desc: 'Games within 2 hours', href: '/explore' },
  { Icon: Calendar, color: '#3b82f6', bg: 'rgba(59,130,246,0.14)', title: 'Book Ground', desc: 'Book your favourite venue', href: '/explore' },
  { Icon: Users, color: '#22c55e', bg: 'rgba(34,197,94,0.14)', title: 'Find Players', desc: "We'll match you with players", href: '/login' },
  { Icon: Trophy, color: '#eab308', bg: 'rgba(234,179,8,0.14)', title: 'Tournaments', desc: 'Upcoming events & leagues', href: '/instructions' },
];

export default function QuickActions() {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
      {ACTIONS.map(({ Icon, color, bg, title, desc, href }) => (
        <Link
          key={title}
          href={href}
          style={{
            background: 'var(--secondary)',
            border: '1px solid var(--glass-border)',
            borderRadius: '16px',
            padding: '16px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          <span style={{ width: 42, height: 42, borderRadius: 12, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={21} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>{desc}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}
