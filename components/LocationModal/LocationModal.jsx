'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, LocateFixed, Loader2, ChevronRight, ChevronLeft, Search, X } from 'lucide-react';
import { INDIA_STATES } from '@/lib/indiaCities';

const CITY_KEY = 'sportferry_city';

export default function LocationModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep]       = useState('prompt'); // prompt | detecting | state | city
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter]   = useState('');
  const [selectedState, setSelectedState] = useState(null);
  const [error, setError]     = useState('');

  useEffect(() => {
    const check = () => {
      if (!localStorage.getItem(CITY_KEY)) {
        setStep('prompt');
        setError('');
        setTimeout(() => setVisible(true), 600);
      }
    };
    check();

    const handler = () => { localStorage.removeItem(CITY_KEY); check(); };
    window.addEventListener('sportferry:resetLocation', handler);
    return () => window.removeEventListener('sportferry:resetLocation', handler);
  }, []);

  const saveCity = (city) => {
    localStorage.setItem(CITY_KEY, city);
    window.dispatchEvent(new CustomEvent('sportferry:citySet', { detail: { city } }));
    setVisible(false);
    // Reset internal state for next open
    setTimeout(() => { setStep('prompt'); setSelectedState(null); setStateFilter(''); setCityFilter(''); }, 400);
  };

  const handleDetect = () => {
    if (!navigator?.geolocation) { setError("Geolocation not supported."); setStep('state'); return; }
    setStep('detecting');
    setError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.county ||
            data.address?.state_district;
          if (city) { saveCity(city); }
          else { setError("Couldn't detect city. Please choose manually."); setStep('state'); }
        } catch { setError("Detection failed. Please choose manually."); setStep('state'); }
      },
      () => { setError("Location access denied. Please choose manually."); setStep('state'); },
      { timeout: 8000 }
    );
  };

  const filteredStates = useMemo(() =>
    INDIA_STATES.filter(s => s.state.toLowerCase().includes(stateFilter.toLowerCase())),
    [stateFilter]
  );

  const filteredCities = useMemo(() => {
    if (!selectedState) return [];
    return selectedState.cities.filter(c => c.toLowerCase().includes(cityFilter.toLowerCase()));
  }, [selectedState, cityFilter]);

  if (!visible) return null;

  /* ─── Shared styles ─── */
  const scrollBox = {
    maxHeight: '320px', overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: '6px',
    paddingRight: '4px',
  };
  const searchStyle = {
    width: '100%', padding: '11px 14px 11px 40px',
    background: 'var(--glass-bg)', border: '1.5px solid var(--glass-border)',
    borderRadius: '12px', color: 'var(--foreground)', fontFamily: 'inherit',
    fontSize: '14px', outline: 'none', marginBottom: '14px',
    boxSizing: 'border-box',
  };
  const rowBtn = (active = false) => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '13px 16px', borderRadius: '12px',
    border: active ? '1.5px solid var(--primary)' : '1px solid var(--glass-border)',
    background: active ? 'rgba(22,163,74,0.07)' : 'var(--glass-bg)',
    cursor: 'pointer', fontFamily: 'inherit',
    fontSize: '14px', fontWeight: '500', color: 'var(--foreground)',
    textAlign: 'left', transition: 'all 0.12s ease', width: '100%',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', animation: 'locFadeIn 0.25s ease',
    }}>
      <div style={{
        background: 'var(--secondary)', borderRadius: '28px',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 40px 80px rgba(0,0,0,0.35)',
        overflow: 'hidden', animation: 'locSlideUp 0.35s ease',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>

        {/* ── Detecting ── */}
        {step === 'detecting' && (
          <div style={{ padding: '72px 40px', textAlign: 'center', flex: 1 }}>
            <div style={{ position: 'relative', width: '72px', height: '72px', margin: '0 auto 24px' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(22,163,74,0.12)', animation: 'locPulse 1.5s ease-in-out infinite' }} />
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(22,163,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={32} color="var(--primary)" style={{ animation: 'locSpin 0.8s linear infinite' }} />
              </div>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Detecting location…</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Please allow access when prompted</p>
          </div>
        )}

        {/* ── Step: Choose State ── */}
        {step === 'state' && (
          <div style={{ padding: '24px 24px 28px', display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <button onClick={() => setStep('prompt')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', flexShrink: 0 }}>
                <ChevronLeft size={22} />
              </button>
              <h2 style={{ fontSize: '19px', fontWeight: '700', flex: 1 }}>Select State</h2>
              <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
            {error && (
              <div style={{ fontSize: '13px', color: '#d97706', background: 'rgba(251,191,36,0.1)', borderRadius: '8px', padding: '9px 12px', marginBottom: '10px' }}>
                {error}
              </div>
            )}
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '14px' }}>
              {INDIA_STATES.length} states & union territories
            </p>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-58%)', color: 'var(--muted)' }} />
              <input
                type="text"
                placeholder="Search state…"
                value={stateFilter}
                onChange={e => setStateFilter(e.target.value)}
                style={searchStyle}
                autoFocus
              />
            </div>

            {/* State list */}
            <div style={scrollBox}>
              {filteredStates.map(s => (
                <button key={s.state} onClick={() => { setSelectedState(s); setCityFilter(''); setStep('city'); }} style={rowBtn()}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MapPin size={14} color="var(--primary)" /> {s.state}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '12px' }}>
                    {s.cities.length} cities <ChevronRight size={14} />
                  </span>
                </button>
              ))}
              {filteredStates.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '14px' }}>
                  No states found for "{stateFilter}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step: Choose City ── */}
        {step === 'city' && selectedState && (
          <div style={{ padding: '24px 24px 28px', display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <button onClick={() => { setStep('state'); setCityFilter(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', flexShrink: 0 }}>
                <ChevronLeft size={22} />
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600', marginBottom: '2px' }}>
                  {selectedState.state}
                </div>
                <h2 style={{ fontSize: '19px', fontWeight: '700' }}>Select City</h2>
              </div>
              <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginTop: '12px' }}>
              <Search size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-58%)', color: 'var(--muted)' }} />
              <input
                type="text"
                placeholder={`Search in ${selectedState.state}…`}
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                style={searchStyle}
                autoFocus
              />
            </div>

            {/* City list — 2-column grid */}
            <div style={{ overflowY: 'auto', maxHeight: '340px', paddingRight: '4px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {filteredCities.map(city => (
                  <button key={city} onClick={() => saveCity(city)} style={{
                    padding: '12px 14px', borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--glass-bg)', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '14px', fontWeight: '500', color: 'var(--foreground)',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'all 0.12s ease',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(22,163,74,0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'var(--glass-bg)'; }}
                  >
                    <MapPin size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
                    {city}
                  </button>
                ))}
              </div>
              {filteredCities.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '14px' }}>
                  No cities found for "{cityFilter}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Main prompt ── */}
        {step === 'prompt' && (
          <>
            {/* Green gradient header */}
            <div style={{
              background: 'linear-gradient(135deg, #15803d, #22c55e)',
              padding: '44px 32px 36px', textAlign: 'center', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ position: 'absolute', bottom: '-40px', left: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />

              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
                <div style={{ position: 'absolute', inset: '-18px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', animation: 'locPulse 2s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', inset: '-36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.12)', animation: 'locPulse 2s 0.6s ease-in-out infinite' }} />
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                  <MapPin size={36} color="white" />
                </div>
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'white', marginBottom: '8px', letterSpacing: '-0.3px' }}>
                Where are you playing?
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '14px', lineHeight: '1.5' }}>
                Allow location or pick your city to see venues near you
              </p>
            </div>

            {/* Buttons */}
            <div style={{ padding: '28px 28px 24px' }}>
              <button
                onClick={handleDetect}
                className="btn-primary"
                style={{
                  width: '100%', padding: '16px', borderRadius: '14px',
                  fontSize: '16px', fontWeight: '700', marginBottom: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  boxShadow: '0 4px 16px rgba(22,163,74,0.3)',
                }}
              >
                <LocateFixed size={20} /> Detect My Location
              </button>

              <button
                onClick={() => setStep('state')}
                style={{
                  width: '100%', padding: '15px', borderRadius: '14px',
                  border: '1.5px solid var(--glass-border)', background: 'var(--glass-bg)',
                  fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                  fontFamily: 'inherit', color: 'var(--foreground)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                }}
              >
                <MapPin size={18} color="var(--primary)" /> Choose City Manually
              </button>

              <button
                onClick={() => setVisible(false)}
                style={{
                  display: 'block', margin: '16px auto 0',
                  background: 'none', border: 'none', color: 'var(--muted)',
                  cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
                }}
              >
                Skip for now
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes locFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes locSlideUp { from { opacity: 0; transform: translateY(32px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes locSpin    { to { transform: rotate(360deg) } }
        @keyframes locPulse   { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.4; transform:scale(1.15) } }
      `}</style>
    </div>
  );
}
