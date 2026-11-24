import React from 'react';
import StateBlock from './StateBlock';
import styles from './ui.module.css';

export default function DataTable({ columns = [], rows = [], rowKey = 'id', empty = 'No records yet.', loading = false }) {
  if (loading) return <StateBlock loading label="Loading…" />;
  if (!rows.length) return <StateBlock label={empty} />;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row[rowKey]}>
              {columns.map(c => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
