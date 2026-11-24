import React from 'react';
import { X } from 'lucide-react';
import styles from './ui.module.css';

export default function ModalShell({ title, onClose, children, footer }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`glass-morphism ${styles.modal}`} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>
        {children}
        {footer && <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '18px' }}>{footer}</div>}
      </div>
    </div>
  );
}
