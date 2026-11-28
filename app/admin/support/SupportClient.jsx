'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/clientApi';
import { formatDayMonth } from '@/lib/format';
import { LifeBuoy, Send } from 'lucide-react';
import styles from '../admin.module.css';

const TABS = ['ALL', 'OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];
const BADGE = { OPEN: styles.badgePending, PENDING: styles.badgePending, RESOLVED: styles.badgeConfirmed, CLOSED: styles.badgeUser };

export default function SupportClient() {
  const [tickets, setTickets] = useState([]);
  const [tab, setTab] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');

  const load = useCallback(async () => {
    const res = await apiFetch('/api/admin/tickets');
    if (res.ok) setTickets((await res.json()).tickets || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = async (body) => {
    if (!selected) return;
    const res = await apiFetch('/api/admin/tickets', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId: selected.id, ...body }),
    });
    if (res.ok) { setReply(''); load(); }
  };

  const rows = tab === 'ALL' ? tickets : tickets.filter(t => t.status === tab);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LifeBuoy size={28} color="#22c55e" />
          <div>
            <h1 className={styles.pageTitle}>Support &amp; Tickets</h1>
            <p className={styles.pageSubtitle}>{tickets.length} support requests</p>
          </div>
        </div>
      </div>
      <div className={styles.tabBar}>
        {TABS.map(t => <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      <div className={styles.overviewGrid}>
        <div className={styles.sectionCard}>
          {rows.length === 0 ? <div className={styles.emptyState}>No tickets.</div> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Subject</th><th>From</th><th>Priority</th><th>Status</th><th>Received</th></tr></thead>
                <tbody>
                  {rows.map(t => (
                    <tr key={t.id} onClick={() => setSelected(t)} style={{ cursor: 'pointer', background: selected?.id === t.id ? 'rgba(34,197,94,0.06)' : undefined }}>
                      <td style={{ fontWeight: 600 }}>{t.subject}</td>
                      <td>{t.createdByName}<div style={{ fontSize: '11px', color: '#64748b' }}>{t.venueName}</div></td>
                      <td>{t.priority}</td>
                      <td><span className={`${styles.badge} ${BADGE[t.status] || styles.badgeUser}`}>{t.status}</span></td>
                      <td style={{ fontSize: '12px' }}>{formatDayMonth(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Ticket detail</h2>
          {!selected ? <div style={{ color: '#64748b', fontSize: '13px' }}>Select a ticket to read and reply.</div> : (
            <>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>{selected.subject}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>{selected.createdByName} · {selected.createdByEmail}</div>
              <p style={{ fontSize: '13px', whiteSpace: 'pre-wrap', marginBottom: '16px' }}>{selected.body}</p>
              {(selected.replies || []).map((r, i) => (
                <div key={i} style={{ padding: '10px', borderRadius: '10px', background: 'var(--admin-border-sub)', marginBottom: '8px', fontSize: '12px' }}>
                  <strong>{r.author}</strong>: {r.body}
                </div>
              ))}
              <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply…" style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '10px', border: '1px solid var(--admin-input-border)', background: 'var(--admin-input-bg)', color: 'var(--admin-text-main)', fontFamily: 'inherit', fontSize: '13px' }} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button className={styles.pageBtn} onClick={() => patch({ reply })} disabled={!reply.trim()} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Send size={14} /> Reply</button>
                <button className={styles.pageBtn} onClick={() => patch({ status: 'RESOLVED' })}>Mark resolved</button>
                <button className={styles.pageBtn} onClick={() => patch({ status: 'CLOSED' })}>Close</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
