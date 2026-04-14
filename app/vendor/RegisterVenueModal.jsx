'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, Image, MapPin, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SPORT_OPTIONS = ['Box Cricket', 'Tennis Ball Cricket', 'Football', 'Badminton', 'Tennis', 'Table Tennis'];
const AMENITY_OPTIONS = ['Parking', 'Drinking Water', 'Restrooms', 'Floodlights', 'Seating Area', 'Equipment Provided', 'Changing Room', 'Cafeteria'];

export default function RegisterVenueModal({ onClose }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', city: '', area: '', address: '',
    pricePerHour: '', imageUrl: '',
    sportTypes: [], amenities: [],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.sportTypes.length === 0) {
      setError('Select at least one sport type.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { onClose(); router.refresh(); }, 1800);
      } else {
        setError(data.message || 'Failed to register venue.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
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
            <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Register New Venue</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>List your sports facility on Sportferry</p>
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
            <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Venue Registered!</h3>
            <p style={{ color: 'var(--muted)' }}>Your venue is now live on Sportferry.</p>
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

            {/* Price */}
            <div>
              <label style={labelStyle}>Price Per Hour (₹) *</label>
              <input name="pricePerHour" value={form.pricePerHour} type="number" min="1" onChange={handleChange} placeholder="e.g. 800" style={inputStyle} required />
            </div>

            {/* Image URL */}
            <div>
              <label style={labelStyle}>Cover Image URL (optional)</label>
              <input name="imageUrl" value={form.imageUrl} onChange={handleChange} placeholder="https://..." style={inputStyle} />
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
                {loading ? 'Registering...' : 'Register Venue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
