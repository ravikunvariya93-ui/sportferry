'use client';

import React, { useState } from 'react';
import { apiFetch, apiErrorMessage } from '@/lib/clientApi';
import { useRouter } from 'next/navigation';
import {
  Check, Plus, Trash2, Upload, AlertCircle, MapPin, Building2, Image as ImageIcon,
} from 'lucide-react';
import { SPORT_TYPES, AMENITIES } from '@/lib/constants';

const STEPS = ['Account', 'Venue & Turfs', 'Amenities', 'Documents', 'Review'];

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.4px' };
const fieldStyle = { width: '100%', padding: '12px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px' };
const cardStyle = { padding: '24px', borderRadius: '16px', background: 'var(--card-bg, #fff)', border: '1px solid var(--glass-border)' };

const emptyTurf = () => ({ name: '', sport: SPORT_TYPES[0], size: { length: '', width: '', unit: 'Feet' }, surface: 'Synthetic Turf', playingFormat: '', lighting: true });

export default function OnboardingWizard({ userName, userEmail, initialPhone, initialBank, initial }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [mobile, setMobile] = useState(initialPhone || '');
  const [venue, setVenue] = useState(initial?.venue || {
    name: '', city: '', area: '', address: '', sportTypes: [], amenities: [], images: [],
    discountPercent: 0, pricing: { weekday: '', weekend: '', peak: '' }, documents: {},
  });
  const [turfs, setTurfs] = useState(initial?.turfs?.length ? initial.turfs : [emptyTurf()]);
  const [bank, setBank] = useState(initialBank || { accountHolderName: '', bankName: '', accountNumber: '', ifsc: '' });

  const setV = (patch) => setVenue(v => ({ ...v, ...patch }));
  const setPricing = (patch) => setV({ pricing: { ...venue.pricing, ...patch } });

  const uploadFiles = async (files) => {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return [];
    const fd = new FormData();
    list.forEach(f => fd.append('files', f));
    const res = await apiFetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) { setError(apiErrorMessage(await res.json(), 'Upload failed.')); return []; }
    return (await res.json()).urls || [];
  };

  const uploadImages = async (files) => {
    setUploading(true); setError('');
    const urls = await uploadFiles(files);
    if (urls.length) setV({ images: [...venue.images, ...urls].slice(0, 6) });
    setUploading(false);
  };

  const uploadDoc = async (key, file) => {
    setUploading(true); setError('');
    const urls = await uploadFiles([file]);
    if (urls.length) setV({ documents: { ...venue.documents, [key]: urls[0] } });
    setUploading(false);
  };

  const toggleSport = (s) => setV({ sportTypes: venue.sportTypes.includes(s) ? venue.sportTypes.filter(x => x !== s) : [...venue.sportTypes, s] });
  const toggleAmenity = (a) => setV({ amenities: venue.amenities.includes(a) ? venue.amenities.filter(x => x !== a) : [...venue.amenities, a] });

  const updateTurf = (i, patch) => setTurfs(list => list.map((t, idx) => idx === i ? { ...t, ...patch } : t));
  const addTurf = () => setTurfs(list => [...list, emptyTurf()]);
  const removeTurf = (i) => setTurfs(list => list.filter((_, idx) => idx !== i));

  const continueStep = async () => {
    setError('');
    if (step === 0) {
      // Save the mobile number for the venue contact details.
      if (mobile.trim()) {
        await apiFetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: mobile.trim() }) }).catch(() => {});
      }
      setStep(1); return;
    }
    if (step === 1) {
      if (!venue.name.trim() || !venue.city.trim() || !venue.area.trim() || !venue.address.trim()) { setError('Fill in venue name, city, area and address.'); return; }
      if (!venue.sportTypes.length) { setError('Select at least one sport.'); return; }
      if (!turfs.length || turfs.some(t => !t.name.trim())) { setError('Every turf needs a name.'); return; }
      setStep(2); return;
    }
    if (step === 2) { setStep(3); return; }
    if (step === 3) {
      if (!Number(venue.pricing.weekday) && !Number(venue.pricing.weekend)) { setError('Enter at least a weekday price.'); return; }
      setStep(4); return;
    }
  };

  const submit = async () => {
    setSaving(true); setError('');
    try {
      const res = await apiFetch('/api/vendor/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: initial?.venueId, venue, turfs, bank }),
      });
      const data = await res.json();
      if (res.ok) { router.push('/vendor'); router.refresh(); }
      else setError(data.message || 'Submission failed.');
    } catch { setError('Network error.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '860px' }}>
      <header>
        <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px' }}>Register Your Ground</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Get listed in a few steps — submit for approval when done.</p>
      </header>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', background: i <= step ? 'var(--primary)' : 'var(--secondary)', color: i <= step ? 'white' : 'var(--muted)', border: `1px solid ${i <= step ? 'var(--primary)' : 'var(--glass-border)'}` }}>
                {i < step ? <Check size={15} /> : i + 1}
              </div>
              <span style={{ fontSize: '13px', fontWeight: i === step ? 700 : 500, color: i === step ? 'var(--foreground)' : 'var(--muted)' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, minWidth: '16px', height: '2px', background: i < step ? 'var(--primary)' : 'var(--glass-border)' }} />}
          </React.Fragment>
        ))}
      </div>

      <div style={cardStyle}>
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Your Account</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div><label style={labelStyle}>Full Name</label><input style={{ ...fieldStyle, opacity: 0.7 }} value={userName || ''} readOnly /></div>
              <div><label style={labelStyle}>Email</label><input style={{ ...fieldStyle, opacity: 0.7 }} value={userEmail || ''} readOnly /></div>
            </div>
            <div>
              <label style={labelStyle}>Mobile Number</label>
              <input style={fieldStyle} value={mobile} onChange={e => setMobile(e.target.value)} placeholder="+91 98765 43210" inputMode="tel" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><Building2 size={18} color="var(--primary)" /> Venue &amp; Turfs</h2>
            <div><label style={labelStyle}>Venue / Business Name *</label><input style={fieldStyle} value={venue.name} onChange={e => setV({ name: e.target.value })} maxLength={60} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div><label style={labelStyle}>City *</label><input style={fieldStyle} value={venue.city} onChange={e => setV({ city: e.target.value })} /></div>
              <div><label style={labelStyle}>Area / Locality *</label><input style={fieldStyle} value={venue.area} onChange={e => setV({ area: e.target.value })} /></div>
            </div>
            <div><label style={labelStyle}>Complete Address *</label><input style={fieldStyle} value={venue.address} onChange={e => setV({ address: e.target.value })} /></div>

            <div>
              <label style={labelStyle}>Sports Offered *</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {SPORT_TYPES.map(s => {
                  const active = venue.sportTypes.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => toggleSport(s)} style={{ padding: '9px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: active ? 'var(--primary)' : 'var(--secondary)', color: active ? 'white' : 'var(--foreground)', border: `1px solid ${active ? 'var(--primary)' : 'var(--glass-border)'}` }}>{s}</button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Venue Photos</label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', border: '1px dashed var(--glass-border)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
                <ImageIcon size={16} /> {uploading ? 'Uploading…' : 'Upload Photos'}
                <input type="file" accept="image/*" multiple hidden onChange={e => uploadImages(e.target.files)} />
              </label>
              {venue.images.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {venue.images.map((u, i) => <img key={i} src={u} alt="" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '10px' }} />)}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Turfs / Courts</h3>
                <button type="button" onClick={addTurf} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', color: 'var(--foreground)', cursor: 'pointer' }}><Plus size={15} /> Add Turf</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {turfs.map((t, i) => (
                  <div key={i} style={{ padding: '14px', background: 'var(--secondary)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                      <div><label style={labelStyle}>Name</label><input style={fieldStyle} value={t.name} onChange={e => updateTurf(i, { name: e.target.value })} placeholder={`Turf ${i + 1}`} /></div>
                      <div><label style={labelStyle}>Sport</label>
                        <select style={{ ...fieldStyle, cursor: 'pointer' }} value={t.sport} onChange={e => updateTurf(i, { sport: e.target.value })}>
                          {SPORT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <button type="button" onClick={() => removeTurf(i)} disabled={turfs.length === 1} style={{ ...fieldStyle, width: '40px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: turfs.length === 1 ? 'not-allowed' : 'pointer', opacity: turfs.length === 1 ? 0.5 : 1 }}><Trash2 size={16} /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                      <div><label style={labelStyle}>Length</label><input style={fieldStyle} inputMode="numeric" value={t.size?.length || ''} onChange={e => updateTurf(i, { size: { ...t.size, length: e.target.value } })} /></div>
                      <div><label style={labelStyle}>Width</label><input style={fieldStyle} inputMode="numeric" value={t.size?.width || ''} onChange={e => updateTurf(i, { size: { ...t.size, width: e.target.value } })} /></div>
                      <div><label style={labelStyle}>Unit</label>
                        <select style={{ ...fieldStyle, cursor: 'pointer' }} value={t.size?.unit || 'Feet'} onChange={e => updateTurf(i, { size: { ...t.size, unit: e.target.value } })}>
                          <option>Feet</option><option>Metres</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Pricing (₹ per player / hour) *</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div><label style={labelStyle}>Weekday</label><input style={fieldStyle} inputMode="numeric" value={venue.pricing.weekday} onChange={e => setPricing({ weekday: e.target.value })} placeholder="1500" /></div>
                <div><label style={labelStyle}>Weekend</label><input style={fieldStyle} inputMode="numeric" value={venue.pricing.weekend} onChange={e => setPricing({ weekend: e.target.value })} placeholder="1800" /></div>
                <div><label style={labelStyle}>Peak (5–11 PM)</label><input style={fieldStyle} inputMode="numeric" value={venue.pricing.peak} onChange={e => setPricing({ peak: e.target.value })} placeholder="optional" /></div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Amenities &amp; Facilities</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
              {AMENITIES.map(a => {
                const active = venue.amenities.includes(a);
                return (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '12px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', background: active ? 'rgba(22,163,74,0.1)' : 'var(--secondary)', color: active ? 'var(--primary)' : 'var(--foreground)', border: `1px solid ${active ? 'var(--primary)' : 'var(--glass-border)'}` }}>
                    {active && <Check size={14} />} {a}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Documents &amp; Payout</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { key: 'businessIdProof', label: 'Business / Owner ID Proof *' },
                { key: 'businessProof', label: 'Business Proof (optional)' },
                { key: 'venueProof', label: 'Venue Proof *' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--secondary)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{label}</span>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '9px', border: '1px dashed var(--glass-border)', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, color: venue.documents?.[key] ? 'var(--primary)' : 'var(--muted)' }}>
                    <Upload size={14} /> {venue.documents?.[key] ? 'Uploaded' : 'Upload'}
                    <input type="file" accept="image/*,application/pdf" hidden onChange={e => uploadDoc(key, e.target.files?.[0])} />
                  </label>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Bank Details (for payouts)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={labelStyle}>Account Holder Name</label><input style={fieldStyle} value={bank.accountHolderName} onChange={e => setBank(b => ({ ...b, accountHolderName: e.target.value }))} /></div>
                <div><label style={labelStyle}>Bank Name</label><input style={fieldStyle} value={bank.bankName} onChange={e => setBank(b => ({ ...b, bankName: e.target.value }))} /></div>
                <div><label style={labelStyle}>Account Number</label><input style={fieldStyle} value={bank.accountNumber} onChange={e => setBank(b => ({ ...b, accountNumber: e.target.value }))} /></div>
                <div><label style={labelStyle}>IFSC Code</label><input style={fieldStyle} value={bank.ifsc} onChange={e => setBank(b => ({ ...b, ifsc: e.target.value }))} /></div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Review &amp; Submit</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '13.5px' }}>
              <div><span style={{ color: 'var(--muted)' }}>Venue</span><div style={{ fontWeight: 700 }}>{venue.name}</div></div>
              <div><span style={{ color: 'var(--muted)' }}>Location</span><div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}><MapPin size={13} /> {venue.area}, {venue.city}</div></div>
              <div><span style={{ color: 'var(--muted)' }}>Sports</span><div style={{ fontWeight: 600 }}>{venue.sportTypes.join(', ')}</div></div>
              <div><span style={{ color: 'var(--muted)' }}>Turfs</span><div style={{ fontWeight: 600 }}>{turfs.length}</div></div>
              <div><span style={{ color: 'var(--muted)' }}>Amenities</span><div style={{ fontWeight: 600 }}>{venue.amenities.join(', ') || '—'}</div></div>
              <div><span style={{ color: 'var(--muted)' }}>Pricing</span><div style={{ fontWeight: 600 }}>₹{venue.pricing.weekday || '—'}/player/hr (weekday)</div></div>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Submitting sends your venue for admin approval. You can edit it later.</p>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 14px', color: '#dc2626', fontSize: '13px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
        <button type="button" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{ padding: '13px 26px', borderRadius: '12px', fontWeight: 600, background: 'var(--secondary)', border: '1px solid var(--glass-border)', color: 'var(--foreground)', cursor: step === 0 ? 'not-allowed' : 'pointer', opacity: step === 0 ? 0.5 : 1 }}>← Back</button>
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={continueStep} className="btn-primary" style={{ padding: '13px 30px', borderRadius: '12px', fontWeight: 700 }}>Continue →</button>
        ) : (
          <button type="button" onClick={submit} disabled={saving} className="btn-primary" style={{ padding: '13px 30px', borderRadius: '12px', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>{saving ? 'Submitting…' : 'Submit for Approval'}</button>
        )}
      </div>
    </div>
  );
}
