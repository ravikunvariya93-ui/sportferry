import React from 'react';
import { Trophy } from 'lucide-react';

export default function PlayerAchievements({ achievements = [] }) {
  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <div className="glass-morphism responsive-padding" style={{ padding: '32px', borderRadius: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={20} color="var(--primary)" /> Achievements
        </h2>
        <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: '600' }}>
          {earnedCount} / {achievements.length} unlocked
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
        {achievements.map((a) => (
          <div key={a.id} style={{
            padding: '16px', borderRadius: '14px', textAlign: 'center',
            border: a.earned ? '1px solid rgba(22,163,74,0.3)' : '1px solid var(--glass-border)',
            background: a.earned ? 'rgba(22,163,74,0.08)' : 'var(--secondary)',
            opacity: a.earned ? 1 : 0.55,
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px', filter: a.earned ? 'none' : 'grayscale(1)' }}>{a.icon}</div>
            <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px', color: 'var(--foreground)' }}>{a.label}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{a.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
