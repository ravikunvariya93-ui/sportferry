'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, apiErrorMessage } from '@/lib/clientApi';
import { useRouter } from 'next/navigation';
import { IndianRupee, Save, CheckCircle2, AlertCircle, Plus, Trash2, X } from 'lucide-react';
import { OFFER_DAYS } from '@/lib/offers';

const fieldStyle = { width: '100%', padding: '12px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px' };
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.4px' };

function VenuePricing({ venue }) {
  const router = useRouter();
  const [form, setForm] = useState({
    weekday: venue.pricing.weekday ?? venue.pricePerHour ?? '',
    weekend: venue.pricing.weekend ?? '',
    peak: venue.pricing.peak ?? '',
    discountPercent: venue.discountPercent || 0,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setSaved(false); setError('');
    try {
      const res = await apiFetch(`/api/vendor/venue/${venue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing: form, discountPercent: form.discountPercent }),
      });
      if (res.ok) { setSaved(true); router.refresh(); }
      else setError(apiErrorMessage(await res.json(), 'Save failed.'));
    } catch { setError('Network error.'); }
    finally { setSaving(false); }
  };

  const preview = (() => {
    const base = Number(form.weekday) || 0;
    const disc = Number(form.discountPercent) || 0;
    return Math.round((base * (100 - disc)) / 100);
  })();

  return (
    <section className="glass-morphism" style={{ padding: '22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
        <IndianRupee size={18} color="var(--primary)" />
        <h2 style={{ fontSize: '17px', fontWeight: 700 }}>{venue.name}</h2>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{venue.city}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
        <div><label style={labelStyle}>Weekday (Mon–Fri) ₹/hr *</label><input style={fieldStyle} inputMode="numeric" value={form.weekday} onChange={e => setForm(p => ({ ...p, weekday: e.target.value }))} /></div>
        <div><label style={labelStyle}>Weekend (Sat–Sun) ₹/hr</label><input style={fieldStyle} inputMode="numeric" value={form.weekend} onChange={e => setForm(p => ({ ...p, weekend: e.target.value }))} placeholder="same as weekday" /></div>
        <div><label style={labelStyle}>Peak Hours (5–11 PM) ₹/hr</label><input style={fieldStyle} inputMode="numeric" value={form.peak} onChange={e => setForm(p => ({ ...p, peak: e.target.value }))} placeholder="optional" /></div>
        <div><label style={labelStyle}>Discount %</label><input style={fieldStyle} inputMode="numeric" value={form.discountPercent} onChange={e => setForm(p => ({ ...p, discountPercent: e.target.value }))} /></div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '18px', flexWrap: 'wrap' }}>
        <button onClick={save} disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 22px', borderRadius: '12px', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
          <Save size={17} /> {saving ? 'Saving…' : 'Save Pricing'}
        </button>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Effective weekday rate: <strong style={{ color: 'var(--primary)' }}>₹{preview}</strong>/player/hr</span>
        {saved && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '13px', fontWeight: 600 }}><CheckCircle2 size={15} /> Saved</span>}
        {error && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontSize: '13px' }}><AlertCircle size={15} /> {error}</span>}
      </div>
    </section>
  );
}

const emptyOffer = (type) => ({ type, title: '', days: [], startTime: '', endTime: '', discountPercent: 10, fixedPrice: 0, validFrom: '', validTo: '', active: true });

function Offers({ type }) {
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState(emptyOffer(type));
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await apiFetch('/api/vendor/offers');
    if (res.ok) setOffers((await res.json()).offers || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault(); setError('');
    const res = await apiFetch('/api/vendor/offers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    if (res.ok) { setShow(false); setForm(emptyOffer(type)); load(); }
    else setError(apiErrorMessage(await res.json(), 'Could not save.'));
  };
  const toggle = async (o) => {
    await apiFetch(`/api/vendor/offers/${o.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !o.active }) });
    load();
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this offer?')) return;
    await apiFetch(`/api/vendor/offers/${id}`, { method: 'DELETE' });
    load();
  };

  const rows = offers.filter(o => o.type === type);
  return (
    <section className="glass-morphism" style={{ padding: '22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{type === 'RECURRING' ? 'Recurring schedules' : 'Special offers'}</h2>
        <button onClick={() => setShow(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', fontWeight: 600 }}><Plus size={16} /> Add</button>
      </div>
      {rows.length === 0 ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px' }}>No {type === 'RECURRING' ? 'recurring schedules' : 'special offers'} yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {rows.map(o => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '160px' }}>
                <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{o.title}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                  {(o.days || []).length ? o.days.join(', ') : 'All days'}{o.startTime ? ` · ${o.startTime}–${o.endTime}` : ''}
                  {o.discountPercent ? ` · ${o.discountPercent}% off` : ` · ₹${o.fixedPrice} flat`}
                </div>
              </div>
              <button onClick={() => toggle(o)} style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer', background: o.active ? 'rgba(22,163,74,0.12)' : 'var(--glass-bg)', color: o.active ? 'var(--primary)' : 'var(--muted)' }}>{o.active ? 'Active' : 'Inactive'}</button>
              <button onClick={() => remove(o.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
      {show && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <form onSubmit={save} className="glass-morphism" style={{ width: '100%', maxWidth: '520px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Add {type === 'RECURRING' ? 'schedule' : 'offer'}</h2>
              <button type="button" onClick={() => setShow(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={18} /></button>
            </div>
            <input style={fieldStyle} placeholder="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            {type === 'RECURRING' && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {OFFER_DAYS.map(d => (
                  <button type="button" key={d} onClick={() => setForm(p => ({ ...p, days: p.days.includes(d) ? p.days.filter(x => x !== d) : [...p.days, d] }))} style={{ padding: '7px 12px', borderRadius: '100px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 600, background: form.days.includes(d) ? 'var(--primary)' : 'var(--secondary)', color: form.days.includes(d) ? 'white' : 'var(--foreground)', border: '1px solid var(--glass-border)' }}>{d}</button>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input style={fieldStyle} type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} />
              <input style={fieldStyle} type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={labelStyle}>Discount %<input style={fieldStyle} inputMode="numeric" value={form.discountPercent} onChange={e => setForm(p => ({ ...p, discountPercent: e.target.value }))} /></label>
              <label style={labelStyle}>Flat price ₹<input style={fieldStyle} inputMode="numeric" value={form.fixedPrice} onChange={e => setForm(p => ({ ...p, fixedPrice: e.target.value }))} /></label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input style={fieldStyle} type="date" value={form.validFrom} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))} />
              <input style={fieldStyle} type="date" value={form.validTo} onChange={e => setForm(p => ({ ...p, validTo: e.target.value }))} />
            </div>
            {error && <div style={{ color: '#dc2626', fontSize: '13px' }}>{error}</div>}
            <button type="submit" className="btn-primary" style={{ padding: '14px', borderRadius: '12px', fontWeight: 700 }}>Save</button>
          </form>
        </div>
      )}
    </section>
  );
}

export default function PricingClient({ venues }) {
  const [tab, setTab] = useState('Regular Pricing');
  const tabs = ['Regular Pricing', 'Recurring', 'Special Offers'];
  return (
    <>
      <header>
        <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px' }}>Pricing &amp; Rules</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Set your per-hour rates, recurring schedules and special offers.</p>
      </header>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '9px 18px', borderRadius: '100px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: tab === t ? 'var(--primary)' : 'var(--secondary)', color: tab === t ? 'white' : 'var(--foreground)', border: `1px solid ${tab === t ? 'var(--primary)' : 'var(--glass-border)'}` }}>{t}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {tab === 'Regular Pricing' && venues.map(v => <VenuePricing key={v.id} venue={v} />)}
        {tab === 'Recurring' && <Offers type="RECURRING" />}
        {tab === 'Special Offers' && <Offers type="SPECIAL" />}
      </div>
    </>
  );
}
