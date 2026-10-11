import React from 'react';
import { User2, Calendar, MapPin } from 'lucide-react';
import LevelBadge from './LevelBadge';
import LevelProgress from './LevelProgress';

export default function ProfileHeader({ name, city, joinedISO, level, actions }) {
  return (
    <div className="glass-morphism" style={{ padding: '36px', borderRadius: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{
          width: '88px', height: '88px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
          boxShadow: '0 8px 24px rgba(22,163,74,0.25)',
        }}>
          <User2 size={44} />
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '8px' }}>
            {name}
          </h1>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: 'var(--muted)', fontSize: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MapPin size={15} color="var(--primary)" /> {city || 'Location not set'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Calendar size={15} /> Joined {new Date(joinedISO).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {actions}
        <LevelBadge level={level} />
      </div>

      <LevelProgress level={level} />
    </div>
  );
}
