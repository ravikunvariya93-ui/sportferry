import React from 'react';

export default function LevelProgress({ level, style }) {
  if (!level) return null;
  return (
    <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid var(--glass-border)', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px', marginBottom: '10px' }}>
        <span style={{ fontWeight: '700', color: 'var(--foreground)' }}>
          Level {level.level} · {level.name}
        </span>
        <span style={{ color: 'var(--muted)' }}>
          {level.nextLevel
            ? `${level.gamesToNext} game${level.gamesToNext === 1 ? '' : 's'} to Level ${level.nextLevel}`
            : 'Max level reached'}
        </span>
      </div>
      <div style={{ height: '10px', borderRadius: '100px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
        <div style={{
          width: `${level.progress}%`, height: '100%', borderRadius: '100px',
          background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
        }} />
      </div>
    </div>
  );
}
