import React from 'react';
import { Trophy } from 'lucide-react';

export default function LevelBadge({ level }) {
  if (!level) return null;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      padding: '10px 18px', borderRadius: '100px', whiteSpace: 'nowrap',
      background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.3)',
      color: 'var(--primary)', fontWeight: '700', fontSize: '14px',
    }}>
      <Trophy size={16} /> Level {level.level} · {level.name}
    </div>
  );
}
