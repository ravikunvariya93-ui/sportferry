'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserCog, Plus, Trash2, X } from 'lucide-react';
import styles from '../admin.module.css';

const fieldStyle = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--admin-input-border)', background: 'var(--admin-input-bg)', color: 'var(--admin-text-main)', fontFamily: 'inherit', fontSize: '13px' };
const ROLES = ['Manager', 'Support', 'Operator', 'Viewer'];

export default function StaffClient() {
  const [staff, setStaff] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'Viewer' });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/staff');
    if (res.ok) setStaff((await res.json()).staff || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault(); setError('');
    const res = await fetch('/api/admin/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { setShow(false); setForm({ name: '', email: '', phone: '', role: 'Viewer' }); load(); }
    else setError((await res.json()).message || 'Could not add staff.');
  };
  const patch = async (id, body) => {
    await fetch(`/api/admin/staff/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    load();
  };
  const remove = async (id) => {
    if (!window.confirm('Remove this staff record?')) return;
    await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <UserCog size={28} color="#22c55e" />
          <div>
            <h1 className={styles.pageTitle}>Staff &amp; Roles</h1>
            <p className={styles.pageSubtitle}>Platform staff directory.</p>
          </div>
        </div>
      </div>
      <div className={styles.sectionCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>{staff.length} staff members</span>
          <button className={styles.pageBtn} onClick={() => setShow(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#16a34a', color: 'white', border: 'none' }}><Plus size={15} /> Add Staff</button>
        </div>
        {staff.length === 0 ? <div className={styles.emptyState}>No staff records.</div> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Name</th><th>Contact</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ fontSize: '12px' }}>{[s.email, s.phone].filter(Boolean).join(' · ') || '—'}</td>
                    <td>
                      <select className={styles.roleSelect} value={s.role} onChange={e => patch(s.id, { role: e.target.value })}>{ROLES.map(r => <option key={r}>{r}</option>)}</select>
                    </td>
                    <td><button className={styles.pageBtn} onClick={() => patch(s.id, { active: !s.active })} style={{ padding: '4px 10px', fontSize: '11px' }}>{s.active ? 'Active' : 'Inactive'}</button></td>
                    <td><button className={`${styles.iconBtn} ${styles.btnDanger}`} onClick={() => remove(s.id)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {show && (
        <div className={styles.modalOverlay}>
          <form onSubmit={save} className={styles.modalCard} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2 className={styles.modalTitle}>Add Staff</h2><button type="button" onClick={() => setShow(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button></div>
            <input style={fieldStyle} placeholder="Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <input style={fieldStyle} placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            <input style={fieldStyle} placeholder="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            <select style={fieldStyle} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>{ROLES.map(r => <option key={r}>{r}</option>)}</select>
            {error && <div style={{ color: '#f87171', fontSize: '13px' }}>{error}</div>}
            <button type="submit" className={styles.btnCancel} style={{ background: '#16a34a', color: 'white', border: 'none' }}>Add</button>
          </form>
        </div>
      )}
    </div>
  );
}
