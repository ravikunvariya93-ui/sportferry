'use client';

import React, { useState } from 'react';
import { apiFetch, apiErrorMessage } from '@/lib/clientApi';
import { useRouter } from 'next/navigation';
import { Plus, MapPin, Edit2, Trash2, X, AlertCircle, Zap, Layers } from 'lucide-react';
import VenueModal from '@/components/VenueModal';
import { SPORT_TYPES } from '@/lib/constants';

const fieldStyle = { width: '100%', padding: '12px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px' };
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.4px' };

function TurfModal({ venueId, turf, onClose, onSaved }) {
  const editing = Boolean(turf);
  const [form, setForm] = useState({
    name: turf?.name || '',
    sport: turf?.sport || SPORT_TYPES[0],
    length: turf?.size?.length || '',
    width: turf?.size?.width || '',
    unit: turf?.size?.unit || 'Feet',
    surface: turf?.surface || 'Synthetic Turf',
    playingFormat: turf?.playingFormat || '',
    lighting: turf?.lighting !== false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Turf name is required.'); return; }
    setLoading(true);
    setError('');
    try {
      const body = {
        name: form.name, sport: form.sport,
        size: { length: form.length, width: form.width, unit: form.unit },
        surface: form.surface, playingFormat: form.playingFormat, lighting: form.lighting,
      };
      const res = await apiFetch(editing ? `/api/vendor/turfs/${turf.id}` : '/api/vendor/turfs', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? body : { ...body, venueId }),
      });
      const data = await res.json();
      if (res.ok) { onSaved(); onClose(); }
      else setError(data.message || 'Save failed.');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={overlay}>
      <div className="glass-morphism" style={modal}>
        <div style={modalHeader}>
          <h2 style={{ fontSize: '19px', fontWeight: 800 }}>{editing ? 'Edit Turf / Court' : 'Add Turf / Court'}</h2>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div><label style={labelStyle}>Turf / Court Name *</label><input style={fieldStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Turf 1" maxLength={60} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>Sport Type *</label>
              <select style={{ ...fieldStyle, cursor: 'pointer' }} value={form.sport} onChange={e => setForm(p => ({ ...p, sport: e.target.value }))}>
                {SPORT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Surface</label>
              <select style={{ ...fieldStyle, cursor: 'pointer' }} value={form.surface} onChange={e => setForm(p => ({ ...p, surface: e.target.value }))}>
                {['Synthetic Turf', 'Natural Grass', 'Concrete', 'Wooden', 'Clay'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>Length</label><input style={fieldStyle} inputMode="numeric" value={form.length} onChange={e => setForm(p => ({ ...p, length: e.target.value }))} placeholder="80" /></div>
            <div><label style={labelStyle}>Width</label><input style={fieldStyle} inputMode="numeric" value={form.width} onChange={e => setForm(p => ({ ...p, width: e.target.value }))} placeholder="40" /></div>
            <div><label style={labelStyle}>Unit</label>
              <select style={{ ...fieldStyle, cursor: 'pointer' }} value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
                <option>Feet</option><option>Metres</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>Playing Format</label><input style={fieldStyle} value={form.playingFormat} onChange={e => setForm(p => ({ ...p, playingFormat: e.target.value }))} placeholder="4v4 / 5v5 / 6v6" /></div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600 }}>
                <input type="checkbox" checked={form.lighting} onChange={e => setForm(p => ({ ...p, lighting: e.target.checked }))} />
                <Zap size={15} color={form.lighting ? 'var(--primary)' : 'var(--muted)'} /> Lighting available
              </label>
            </div>
          </div>
          {error && <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#dc2626', fontSize: '13px', background: 'rgba(239,68,68,0.08)', padding: '10px 14px', borderRadius: '10px' }}><AlertCircle size={15} /> {error}</div>}
          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '14px', borderRadius: '12px', fontWeight: 700, opacity: loading ? 0.7 : 1 }}>{loading ? 'Saving…' : editing ? 'Save Turf' : 'Add Turf'}</button>
        </form>
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' };
const modal = { width: '100%', maxWidth: '560px', maxHeight: '95vh', overflowY: 'auto' };
const modalHeader = { padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const iconBtn = { background: 'var(--secondary)', border: '1px solid var(--glass-border)', height: '36px', width: '36px', borderRadius: '10px', cursor: 'pointer', color: 'var(--foreground)' };

export default function GroundsClient({ venues }) {
  const router = useRouter();
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [turfModal, setTurfModal] = useState(null); // { venueId, turf? }

  const refresh = () => router.refresh();

  const deleteVenue = async (venueId) => {
    if (!window.confirm('Delete this venue? This cannot be undone.')) return;
    const res = await apiFetch(`/api/venues/${venueId}`, { method: 'DELETE' });
    if (res.ok) refresh();
    else alert(apiErrorMessage(await res.json(), 'Failed to delete.'));
  };

  const deleteTurf = async (id) => {
    if (!window.confirm('Remove this turf?')) return;
    const res = await apiFetch(`/api/vendor/turfs/${id}`, { method: 'DELETE' });
    if (res.ok) refresh();
    else alert(apiErrorMessage(await res.json(), 'Failed to remove turf.'));
  };

  return (
    <>
      {showVenueModal && <VenueModal onClose={() => { setShowVenueModal(false); refresh(); }} />}
      {editingVenue && <VenueModal editingVenue={editingVenue} onClose={() => { setEditingVenue(null); refresh(); }} />}
      {turfModal && <TurfModal venueId={turfModal.venueId} turf={turfModal.turf} onClose={() => setTurfModal(null)} onSaved={refresh} />}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px' }}>Grounds &amp; Courts</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Manage your venues and the turfs/courts under them.</p>
        </div>
        <button onClick={() => setShowVenueModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: 600 }}>
          <Plus size={18} /> Add Venue
        </button>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {venues.map(v => (
          <section key={v.id} className="glass-morphism" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '14px', minWidth: 0 }}>
                <img src={v.images[0] || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=200'} alt={v.name} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '12px', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontSize: '17px', fontWeight: 700 }}>{v.name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontSize: '13px', marginTop: '3px' }}>
                    <MapPin size={13} /> {v.area}, {v.city}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 9px', borderRadius: '100px', fontWeight: 700, background: v.onboardingStatus === 'ACTIVE' ? 'rgba(22,163,74,0.12)' : 'rgba(251,191,36,0.16)', color: v.onboardingStatus === 'ACTIVE' ? 'var(--primary)' : '#b45309' }}>{v.onboardingStatus}</span>
                    {v.sportTypes.map(s => <span key={s} style={{ fontSize: '11px', padding: '2px 9px', borderRadius: '100px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--muted)', fontWeight: 600 }}>{s}</span>)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setEditingVenue(v)} style={iconBtn} title="Edit Venue"><Edit2 size={17} /></button>
                <button onClick={() => deleteVenue(v.id)} style={{ ...iconBtn, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }} title="Delete Venue"><Trash2 size={17} /></button>
              </div>
            </div>

            <div style={{ marginTop: '18px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px' }}><Layers size={15} color="var(--primary)" /> Turfs / Courts ({v.turfs.length})</h3>
                <button onClick={() => setTurfModal({ venueId: v.id })} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', color: 'var(--foreground)', cursor: 'pointer' }}><Plus size={15} /> Add Turf</button>
              </div>
              {v.turfs.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: '13px', padding: '12px', background: 'var(--secondary)', borderRadius: '10px' }}>No turfs yet — add your first turf/court.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                  {v.turfs.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--secondary)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(22,163,74,0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>{t.order}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>{t.sport}{t.size?.length ? ` · ${t.size.length}×${t.size.width} ${t.size.unit}` : ''}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => setTurfModal({ venueId: v.id, turf: t })} style={{ ...iconBtn, height: '30px', width: '30px' }} title="Edit Turf"><Edit2 size={14} /></button>
                        <button onClick={() => deleteTurf(t.id)} style={{ ...iconBtn, height: '30px', width: '30px', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }} title="Remove Turf"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
        {!venues.length && (
          <div className="glass-morphism" style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>No venues yet. Add your first venue to get started.</div>
        )}
      </div>
    </>
  );
}
