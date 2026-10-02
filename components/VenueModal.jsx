'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, MapPin, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SPORT_OPTIONS = ['Box Cricket'];
const AMENITY_OPTIONS = ['Parking', 'Drinking Water', 'Restrooms', 'Floodlights', 'Seating Area', 'Equipment Provided', 'Changing Room', 'Cafeteria'];

export default function VenueModal({ onClose, editingVenue = null }) {
  const router = useRouter();
  const isEdit = !!editingVenue;

  const [form, setForm] = useState({
    name: editingVenue?.name || '',
    city: editingVenue?.city || '',
    area: editingVenue?.area || '',
    address: editingVenue?.address || '',
    pricePerHour: editingVenue?.pricePerHour || '',
    numberOfTurfs: editingVenue?.numberOfTurfs || 1,
    sportTypes: editingVenue?.sportTypes || [],
    amenities: editingVenue?.amenities || [],
  });

  // Cover + gallery images (Vercel Blob). Existing URLs kept until removed.
  const [existingImages, setExistingImages] = useState(editingVenue?.images || []);
  const [coverSel, setCoverSel] = useState(null); // { file, preview }
  const [gallerySel, setGallerySel] = useState([]); // [{ file, preview }]
  const [uploading, setUploading] = useState(false);
  const coverInputRef = React.useRef(null);
  const galleryInputRef = React.useRef(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submitControllerRef = React.useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      if (submitControllerRef.current) submitControllerRef.current.abort();
    };
  }, []);

  const toggleArrayItem = (field, item) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(x => x !== item)
        : [...prev[field], item],
    }));
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const pickCover = (e) => {
    const f = e.target.files?.[0];
    if (f) setCoverSel({ file: f, preview: URL.createObjectURL(f) });
    setError('');
  };

  const pickGallery = (e) => {
    const files = [...(e.target.files || [])].slice(0, 5);
    if (files.length) {
      setGallerySel(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))].slice(0, 5));
    }
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.sportTypes.length === 0) {
      setError('Select at least one sport type.');
      return;
    }

    if (submitControllerRef.current) submitControllerRef.current.abort();
    submitControllerRef.current = new AbortController();
    const signal = submitControllerRef.current.signal;

    setLoading(true);
    setError('');

    try {
      // 1. Upload new cover/gallery files to Vercel Blob first
      let images = [...existingImages];
      const toUpload = [];
      if (coverSel) toUpload.push(coverSel.file);
      gallerySel.forEach(g => toUpload.push(g.file));
      if (toUpload.length > 0) {
        setUploading(true);
        const fd = new FormData();
        toUpload.slice(0, 6).forEach(f => fd.append('files', f));
        const up = await fetch('/api/upload', { method: 'POST', body: fd, signal });
        const ud = await up.json();
        setUploading(false);
        if (!up.ok) {
          setError(ud.message || 'Image upload failed.');
          setLoading(false);
          return;
        }
        const urls = ud.urls || [];
        let ui = 0;
        if (coverSel && urls[ui]) {
          images = images.length ? [urls[ui], ...images.slice(1)] : [urls[ui]];
          ui++;
        }
        images = [...images, ...urls.slice(ui)];
      }

      // 2. Save venue with final images array
      const payload = { ...form, images };
      const url = isEdit ? `/api/venues/${editingVenue.id || editingVenue._id}` : '/api/venues';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { onClose(); router.refresh(); }, 1800);
      } else {
        setError(data.message || `Failed to ${isEdit ? 'update' : 'register'} venue.`);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px', background: 'var(--secondary)',
    border: '1px solid var(--glass-border)', borderRadius: '10px',
    color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px',
    outline: 'none',
  };
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--muted)' };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--secondary)', borderRadius: '24px', width: '100%', maxWidth: '580px',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 64px rgba(0,0,0,0.2)',
        border: '1px solid var(--glass-border)',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--secondary)', zIndex: 1 }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700' }}>{isEdit ? 'Edit Venue' : 'Register New Venue'}</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              {isEdit ? `Updating ${editingVenue.name}` : 'List your sports facility on Sportferry'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}>
            <X size={22} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: '60px 28px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle2 size={32} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Venue {isEdit ? 'Updated' : 'Registered'}!</h3>
            <p style={{ color: 'var(--muted)' }}>
              {isEdit ? 'Changes have been saved successfully.' : 'Your venue is now live on Sportferry.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>Venue Name *</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Green Turf Arena" style={inputStyle} required />
            </div>

            {/* City + Area */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>City *</label>
                <input name="city" value={form.city} onChange={handleChange} placeholder="e.g. Surat" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Area / Locality *</label>
                <input name="area" value={form.area} onChange={handleChange} placeholder="e.g. Adajan" style={inputStyle} required />
              </div>
            </div>

            {/* Address */}
            <div>
              <label style={labelStyle}>Full Address *</label>
              <input name="address" value={form.address} onChange={handleChange} placeholder="Street, landmark, etc." style={inputStyle} required />
            </div>

            {/* Price + Number of Turfs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Price Per Hour (₹) *</label>
                <input name="pricePerHour" value={form.pricePerHour} type="number" min="1" onChange={handleChange} placeholder="e.g. 800" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Number of Turfs *</label>
                <input name="numberOfTurfs" value={form.numberOfTurfs} type="number" min="1" step="1" onChange={handleChange} placeholder="e.g. 2" style={inputStyle} required />
              </div>
            </div>

            {/* Cover Image — upload */}
            <div>
              <label style={labelStyle}>Cover Image {existingImages[0] || coverSel ? '' : '(optional)'}</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                {(coverSel?.preview || existingImages[0]) && (
                  <div style={{ position: 'relative' }}>
                    <img src={coverSel?.preview || existingImages[0]} alt="Cover"
                      style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1.5px solid var(--primary)' }} />
                    <span style={{ position: 'absolute', bottom: '4px', left: '4px', fontSize: '10px', fontWeight: '700', background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '100px' }}>COVER</span>
                    <button type="button" title="Remove cover" onClick={() => {
                      if (coverSel) { setCoverSel(null); if (coverInputRef.current) coverInputRef.current.value = ''; }
                      else setExistingImages(prev => prev.slice(1));
                    }}
                      style={{ position: 'absolute', top: '-8px', right: '-8px', width: '22px', height: '22px', borderRadius: '50%', background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', lineHeight: 1 }}>×</button>
                  </div>
                )}
                <div>
                  <input ref={coverInputRef} type="file" accept="image/*" onChange={pickCover} style={{ display: 'none' }} />
                  <button type="button" onClick={() => coverInputRef.current?.click()}
                    style={{ padding: '10px 18px', borderRadius: '10px', border: '1px dashed var(--glass-border)', background: 'var(--glass-bg)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', color: 'var(--foreground)' }}>
                    {coverSel || existingImages[0] ? 'Change cover…' : 'Upload cover…'}
                  </button>
                  {coverSel && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>New: {coverSel.file.name}</div>}
                </div>
              </div>
            </div>

            {/* Other Images — upload up to 5 */}
            <div>
              <label style={labelStyle}>Other Images (up to 5, optional)</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {existingImages.slice(1).map((src, i) => {
                  const idx = 1 + i;
                  return (
                    <div key={`${src}-${idx}`} style={{ position: 'relative' }}>
                      <img src={src} alt={`Venue ${idx + 1}`}
                        style={{ width: '88px', height: '64px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--glass-border)' }} />
                      <button type="button" title="Remove" onClick={() => setExistingImages(prev => prev.filter((_, j) => j !== idx))}
                        style={{ position: 'absolute', top: '-8px', right: '-8px', width: '22px', height: '22px', borderRadius: '50%', background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', lineHeight: 1 }}>×</button>
                      <button type="button" title="Make cover" onClick={() => setExistingImages(prev => [prev[idx], ...prev.filter((_, j) => j !== idx)])}
                        style={{ position: 'absolute', bottom: '4px', left: '4px', fontSize: '9px', fontWeight: '700', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 6px', borderRadius: '100px', border: 'none', cursor: 'pointer' }}>COVER</button>
                    </div>
                  );
                })}
                {gallerySel.map((g, i) => (
                  <div key={`new-${i}`} style={{ position: 'relative' }}>
                    <img src={g.preview} alt="New"
                      style={{ width: '88px', height: '64px', objectFit: 'cover', borderRadius: '10px', border: '1.5px dashed var(--primary)' }} />
                    <button type="button" title="Remove" onClick={() => setGallerySel(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: '-8px', right: '-8px', width: '22px', height: '22px', borderRadius: '50%', background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
              <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={pickGallery} style={{ display: 'none' }} />
              <button type="button" onClick={() => galleryInputRef.current?.click()}
                style={{ padding: '10px 18px', borderRadius: '10px', border: '1px dashed var(--glass-border)', background: 'var(--glass-bg)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', color: 'var(--foreground)' }}>
                + Add images…
              </button>
            </div>

            {/* Sport Types */}
            <div>
              <label style={labelStyle}>Sport Types * (select all that apply)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {SPORT_OPTIONS.map(sport => {
                  const active = form.sportTypes.includes(sport);
                  return (
                    <button key={sport} type="button" onClick={() => toggleArrayItem('sportTypes', sport)} style={{
                      padding: '8px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit',
                      background: active ? 'var(--primary)' : 'var(--glass-bg)',
                      color: active ? 'white' : 'var(--foreground)',
                      border: active ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                      transition: 'all 0.15s ease',
                    }}>
                      {sport}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label style={labelStyle}>Amenities (optional)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {AMENITY_OPTIONS.map(a => {
                  const active = form.amenities.includes(a);
                  return (
                    <button key={a} type="button" onClick={() => toggleArrayItem('amenities', a)} style={{
                      padding: '8px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit',
                      background: active ? 'rgba(22,163,74,0.12)' : 'var(--glass-bg)',
                      color: active ? 'var(--primary)' : 'var(--foreground)',
                      border: active ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                      transition: 'all 0.15s ease',
                    }}>
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 14px', color: '#dc2626', fontSize: '13px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500', color: 'var(--foreground)' }}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 2, padding: '14px', borderRadius: '12px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? (uploading ? 'Uploading images…' : isEdit ? 'Updating...' : 'Registering...') : (isEdit ? 'Save Changes' : 'Register Venue')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
