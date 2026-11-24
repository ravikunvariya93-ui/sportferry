import React from 'react';
import styles from './ui.module.css';

export default function PageHeader({ title, description, actions }) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: description ? 6 : 0 }}>{title}</h1>
        {description && <p style={{ color: 'var(--muted)', fontSize: 14 }}>{description}</p>}
      </div>
      {actions}
    </header>
  );
}
