import React from 'react';
import styles from './ui.module.css';

export default function Field({ label, children, error, style }) {
  return (
    <label style={style}>
      {label && <span className={styles.label}>{label}</span>}
      {children}
      {error && <span className={styles.error}>{error}</span>}
    </label>
  );
}

export const fieldClass = styles.field;
