'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserCog, Plus, Trash2, X } from 'lucide-react';

const ROLES = ['Manager', 'Operator', 'Viewer'];
const fieldStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--secondary)', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px' };

export default function StaffClient() {
  const [staff, setStaff] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'Viewer', access: 'Bookings, Check-in' });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/vendor/staff');
    if (res.ok) setStaff((await res.json()).staff || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault(); setError('');
    const res = await fetch('/api/vendor/staff', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    if (res.ok) { setShow(false); setForm({ name: '', email: '', phone: '', role: 'Viewer', access: 'Bookings, Check-in' }); load(); }
    else setError((await res.json()).message || 'Could not add staff.');
  };

  const patch = async (id, body) => {
    await fetch(`/api/vendor/staff/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    load();
  };
  const remove = async (id) => {
    if (!window.confirm('Remove this staff member?')) return;
    await fetch(`/api/vendor/staff/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.5px' }}>Staff &amp; Access</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>People who help run your venues.</p>
        </div>
        <button onClick={() => setShow(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: 600 }}><Plus size={17} /> Add Staff</button>
      </header>

      <section className="glass-morphism" style={{ padding: '22px' }}>
        {staff.length === 0 ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px' }}>No staff added yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                {['Name', 'Contact', 'Role', 'Access', 'Status', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UserCog size={15} color="var(--primary)" /> {s.name}</span>
                    </td>
                    <td style={{ fontSize: '12px' }}>{[s.email, s.phone].filter(Boolean).join(' · ') || '—'}</td>
                    <td>
                      <select value={s.role} onChange={e => patch(s.id, { role: e.target.value })} style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--secondary)', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '12px' }}>
                        {ROLES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '12px' }}>{s.access || '—'}</td>
                    <td>
                      <button onClick={() => patch(s.id, { active: !s.active })} style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer', background: s.active ? 'rgba(22,163,74,0.12)' : 'var(--glass-bg)', color: s.active ? 'var(--primary)' : 'var(--muted)' }}>{s.active ? 'Active' : 'Inactive'}</button>
                    </td>
                    <td><button onClick={() => remove(s.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }} title="Remove"><Trash2 size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {show && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <form onSubmit={save} className="glass-morphism" style={{ width: '100%', maxWidth: '460px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Add Staff Member</h2>
              <button type="button" onClick={() => setShow(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={18} /></button>
            </div>
            <input style={fieldStyle} placeholder="Full name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <input style={fieldStyle} placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            <input style={fieldStyle} placeholder="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            <select style={fieldStyle} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>{ROLES.map(r => <option key={r}>{r}</option>)}</select>
            <input style={fieldStyle} placeholder="Access (e.g. Bookings, Check-in)" value={form.access} onChange={e => setForm(p => ({ ...p, access: e.target.value }))} />
            {error && <div style={{ color: '#dc2626', fontSize: '13px' }}>{error}</div>}
            <button type="submit" className="btn-primary" style={{ padding: '14px', borderRadius: '12px', fontWeight: 700 }}>Add Staff</button>
          </form>
        </div>
      )}
    </div>
  );
}
