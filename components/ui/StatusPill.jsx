import React from 'react';
import { statusStyle } from '@/lib/statusStyles';
import styles from './ui.module.css';

export default function StatusPill({ status, label, overrides }) {
  const style = statusStyle(status, { ...(label ? { label } : {}), ...(overrides || {}) });
  return <span className={styles.pill} style={{ background: style.bg, color: style.color }}>{style.label}</span>;
}
