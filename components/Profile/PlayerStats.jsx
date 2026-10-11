import React from 'react';
import { Trophy, Calendar, Map } from 'lucide-react';

export default function PlayerStats({ gamesPlayed = 0, upcoming = 0, venues = 0 }) {
  const stats = [
    { label: 'Games Played', value: gamesPlayed, Icon: Trophy },
    { label: 'Upcoming', value: upcoming, Icon: Calendar },
    { label: 'Venues Played', value: venues, Icon: Map },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
      {stats.map(({ label, value, Icon }) => (
        <div key={label} style={{ background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Icon size={15} color="var(--primary)" /> {label}
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800' }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
