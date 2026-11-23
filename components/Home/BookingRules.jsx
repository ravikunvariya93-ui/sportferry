import React from 'react';
import { Megaphone, Users, User, Trophy } from 'lucide-react';

const RULES = [
  { Icon: Users, color: '#2563eb', title: 'Team Booking (4 vs 4)', text: 'If 4 players book on one side, the opposite side also needs 4 players (a team or solo players).' },
  { Icon: User, color: '#0f172a', title: 'Solo Booking', text: 'When 6 solo players book, the game confirms — regardless of sides.' },
  { Icon: Trophy, color: '#ea580c', title: 'Group Booking', text: 'Book the entire turf for your group. No other players can join.' },
];

export default function BookingRules() {
  return (
    <section style={{ border: '1px solid rgba(22,163,74,0.35)', borderRadius: '20px', padding: '20px 24px', background: 'var(--secondary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Megaphone size={20} color="var(--primary)" />
        <div>
          <div style={{ fontSize: '17px', fontWeight: 800 }}>Booking Rules</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Know how games get confirmed</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {RULES.map(({ Icon, color, title, text }) => (
          <div key={title} style={{ display: 'flex', gap: '10px' }}>
            <Icon size={18} color={color} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color, marginBottom: '4px' }}>{title}</div>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.5 }}>{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
