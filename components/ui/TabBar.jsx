import React from 'react';
import styles from './ui.module.css';

export default function TabBar({ tabs = [], active, onChange }) {
  return (
    <div className={styles.tabs}>
      {tabs.map(tab => {
        const key = tab.key ?? tab.label;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`${styles.tab} ${active === key ? styles.tabActive : ''}`}
          >
            {tab.label ?? key}
          </button>
        );
      })}
    </div>
  );
}
