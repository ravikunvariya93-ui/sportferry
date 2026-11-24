import React from 'react';
import styles from './ui.module.css';

export default function StateBlock({ icon = '', label, action, loading = false }) {
  return (
    <div className={styles.state}>
      {icon && <div className={styles.stateIcon}>{icon}</div>}
      <div>{loading ? (label || 'Loading…') : label}</div>
      {action}
    </div>
  );
}
