'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, apiErrorMessage } from '@/lib/clientApi';
import { Tag, Plus, Trash2, X } from 'lucide-react';
import styles from '../admin.module.css';
import { OFFER_DAYS } from '@/lib/offers';

const fieldStyle = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--admin-input-border)', background: 'var(--admin-input-bg)', color: 'var(--admin-text-main)', fontFamily: 'inherit', fontSize: '13px' };

export default function PromotionsClient() {
  const [offers, setOffers] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ type: 'SPECIAL', title: '', days: [], startTime: '', endTime: '', discountPercent: 10, fixedPrice: 0, validFrom: '', validTo: '', active: true });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await apiFetch('/api/admin/offers');
    if (res.ok) setOffers((await res.json()).offers || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault(); setError('');
    const res = await apiFetch('/api/admin/offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { setShow(false); load(); }
    else setError(apiErrorMessage(await res.json(), 'Could not save.'));
  };
  const toggle = async (o) => {
    await apiFetch(`/api/admin/offers/${o.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !o.active }) });
    load();
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this offer?')) return;
    await apiFetch(`/api/admin/offers/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Tag size={28} color="#22c55e" />
          <div>
            <h1 className={styles.pageTitle}>Promotions &amp; Offers</h1>
            <p className={styles.pageSubtitle}>Platform offers and owner schedules.</p>
          </div>
        </div>
      </div>
      <div className={styles.sectionCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>{offers.length} offer{offers.length !== 1 ? 's' : ''}</span>
          <button className={styles.pageBtn} onClick={() => setShow(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#16a34a', color: 'white', border: 'none' }}><Plus size={15} /> Add Offer</button>
        </div>
        {offers.length === 0 ? (
          <div className={styles.emptyState}>No offers yet.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Title</th><th>Type</th><th>Owner</th><th>Days / Time</th><th>Discount</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {offers.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.title}</td>
                    <td>{o.type}</td>
                    <td>{o.vendorName}</td>
                    <td style={{ fontSize: '12px' }}>{(o.days || []).join(', ') || 'All days'}{o.startTime ? ` · ${o.startTime}–${o.endTime}` : ''}</td>
                    <td>{o.discountPercent ? `${o.discountPercent}%` : `₹${o.fixedPrice}`}</td>
                    <td><button className={styles.pageBtn} onClick={() => toggle(o)} style={{ padding: '4px 10px', fontSize: '11px' }}>{o.active ? 'Active' : 'Inactive'}</button></td>
                    <td><button className={`${styles.iconBtn} ${styles.btnDanger}`} onClick={() => remove(o.id)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {show && (
        <div className={styles.modalOverlay}>
          <form onSubmit={save} className={styles.modalCard} style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2 className={styles.modalTitle}>Add Offer</h2><button type="button" onClick={() => setShow(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button></div>
            <select style={fieldStyle} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}><option value="SPECIAL">Special</option><option value="RECURRING">Recurring</option></select>
            <input style={fieldStyle} placeholder="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            {form.type === 'RECURRING' && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {OFFER_DAYS.map(d => <button type="button" key={d} onClick={() => setForm(p => ({ ...p, days: p.days.includes(d) ? p.days.filter(x => x !== d) : [...p.days, d] }))} style={{ padding: '6px 10px', borderRadius: '100px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', background: form.days.includes(d) ? '#16a34a' : 'transparent', color: form.days.includes(d) ? 'white' : 'inherit', border: '1px solid var(--admin-border)' }}>{d}</button>)}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input style={fieldStyle} type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} />
              <input style={fieldStyle} type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input style={fieldStyle} placeholder="Discount %" value={form.discountPercent} onChange={e => setForm(p => ({ ...p, discountPercent: e.target.value }))} />
              <input style={fieldStyle} placeholder="Flat price ₹" value={form.fixedPrice} onChange={e => setForm(p => ({ ...p, fixedPrice: e.target.value }))} />
            </div>
            {error && <div style={{ color: '#f87171', fontSize: '13px' }}>{error}</div>}
            <button type="submit" className={styles.btnCancel} style={{ background: '#16a34a', color: 'white', border: 'none' }}>Save offer</button>
          </form>
        </div>
      )}
    </div>
  );
}
