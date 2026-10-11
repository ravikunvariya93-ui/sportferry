'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, LocateFixed, Loader2, ChevronLeft, Search, X } from 'lucide-react';
import { INDIA_STATES } from '@/lib/indiaCities';

const CITY_KEY = 'sportferry_city';
const SKIPPED_KEY = 'sportferry_location_skipped';
const MAX_RESULTS = 60;

// Flat, searchable list of every city paired with the state it belongs to.
const ALL_CITIES = INDIA_STATES.flatMap((s) => s.cities.map((city) => ({ city, state: s.state })));

const readLS = (k) => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const writeLS = (k, v) => {
  try { localStorage.setItem(k, v); } catch { /* storage blocked — ignore */ }
};
const removeLS = (k) => {
  try { localStorage.removeItem(k); } catch { /* ignore */ }
};

export default function LocationModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep]       = useState('prompt'); // prompt | detecting | city
  const [cityFilter, setCityFilter]   = useState('');
  const [error, setError]     = useState('');
  const [neverAgain, setNeverAgain] = useState(true);

  useEffect(() => {
    let timer = null;
    const check = () => {
      // Show only when no saved city AND user hasn't dismissed before
      if (!readLS(CITY_KEY) && !readLS(SKIPPED_KEY)) {
        setStep('prompt');
        setError('');
        timer = setTimeout(() => setVisible(true), 600);
      }
    };
    check();

    const onReset = () => {
      removeLS(CITY_KEY);
      removeLS(SKIPPED_KEY); // user explicitly wants to re-pick
      check();
    };
    // If city gets saved elsewhere (another component/tab), hide immediately
    const onCitySet = () => {
      if (readLS(CITY_KEY)) {
        removeLS(SKIPPED_KEY);
        setVisible(false);
      }
    };
    const onStorage = (e) => {
      if (e.key === CITY_KEY && e.newValue) setVisible(false);
      if (e.key === CITY_KEY && !e.newValue) check();
    };
    window.addEventListener('sportferry:resetLocation', onReset);
    window.addEventListener('sportferry:citySet', onCitySet);
    window.addEventListener('storage', onStorage);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('sportferry:resetLocation', onReset);
      window.removeEventListener('sportferry:citySet', onCitySet);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Dismiss without saving a city.
  // "Don't show again" checked → suppress permanently; unchecked → only this visit
  const dismiss = () => {
    if (neverAgain) writeLS(SKIPPED_KEY, '1');
    else removeLS(SKIPPED_KEY);
    setVisible(false);
    setTimeout(() => { setStep('prompt'); setCityFilter(''); setNeverAgain(true); }, 400);
  };

  const saveCity = (city) => {
    writeLS(CITY_KEY, city);
    removeLS(SKIPPED_KEY);
    window.dispatchEvent(new CustomEvent('sportferry:citySet', { detail: { city } }));
    setVisible(false);
    // Reset internal state for next open
    setTimeout(() => { setStep('prompt'); setCityFilter(''); }, 400);
  };

  const handleDetect = () => {
    if (!navigator?.geolocation) { setError("Geolocation not supported."); setStep('city'); return; }
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
          else { setError("Couldn't detect city. Please type it below."); setStep('city'); }
        } catch { setError("Detection failed. Please type it below."); setStep('city'); }
      },
      () => { setError("Location access denied. Please type it below."); setStep('city'); },
      { timeout: 8000 }
    );
  };

  // Match every Indian city whose name contains the query, exact/prefix first.
  const results = useMemo(() => {
    const q = cityFilter.trim().toLowerCase();
    if (!q) return [];
    return ALL_CITIES
      .filter(c => c.city.toLowerCase().includes(q))
      .sort((a, b) => {
        const ap = a.city.toLowerCase().startsWith(q) ? 0 : 1;
        const bp = b.city.toLowerCase().startsWith(q) ? 0 : 1;
        return ap - bp || a.city.localeCompare(b.city) || a.state.localeCompare(b.state);
      });
  }, [cityFilter]);

  if (!visible) return null;

  /* ─── Shared styles ─── */
  const searchStyle = {
    width: '100%', padding: '11px 14px 11px 40px',
    background: 'var(--glass-bg)', border: '1.5px solid var(--glass-border)',
    borderRadius: '12px', color: 'var(--foreground)', fontFamily: 'inherit',
    fontSize: '14px', outline: 'none', marginBottom: '14px',
    boxSizing: 'border-box',
  };
  const rowBtn = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '13px 16px', borderRadius: '12px',
    border: '1px solid var(--glass-border)',
    background: 'var(--glass-bg)',
    cursor: 'pointer', fontFamily: 'inherit',
    fontSize: '14px', fontWeight: '500', color: 'var(--foreground)',
    textAlign: 'left', transition: 'all 0.12s ease', width: '100%',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', animation: 'locFadeIn 0.25s ease',
    }}>
      <div style={{
        background: 'var(--secondary)', borderRadius: '24px',
        width: '100%', maxWidth: '380px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
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

        {/* ── Step: Search City ── */}
        {step === 'city' && (
          <div style={{ padding: '24px 24px 28px', display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <button onClick={() => { setStep('prompt'); setCityFilter(''); }} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', flexShrink: 0 }}>
                <ChevronLeft size={22} />
              </button>
              <h2 style={{ fontSize: '19px', fontWeight: '700', flex: 1 }}>Select City</h2>
              <button onClick={dismiss} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
            {error && (
              <div style={{ fontSize: '13px', color: '#d97706', background: 'rgba(251,191,36,0.1)', borderRadius: '8px', padding: '9px 12px', marginBottom: '10px' }}>
                {error}
              </div>
            )}

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-58%)', color: 'var(--muted)' }} />
              <input
                type="text"
                placeholder="Type a city, e.g. Bhavnagar"
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                style={searchStyle}
                autoFocus
              />
            </div>

            {/* Results */}
            <div style={{ overflowY: 'auto', maxHeight: '340px', paddingRight: '4px' }}>
              {cityFilter.trim() === '' ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '13px' }}>
                  Start typing your city name to search across India
                </div>
              ) : results.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '14px' }}>
                  No cities named &quot;{cityFilter}&quot;
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {results.slice(0, MAX_RESULTS).map(c => (
                      <button
                        key={`${c.city}-${c.state}`}
                        onClick={() => saveCity(c.city)}
                        style={rowBtn}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(22,163,74,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'var(--glass-bg)'; }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <MapPin size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: 600 }}>{c.city}</span>
                        </span>
                        <span style={{ color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap', marginLeft: '8px' }}>{c.state}</span>
                      </button>
                    ))}
                  </div>
                  {results.length > MAX_RESULTS && (
                    <div style={{ textAlign: 'center', padding: '12px', color: 'var(--muted)', fontSize: '12px' }}>
                      Showing {MAX_RESULTS} of {results.length} — keep typing to narrow
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Main prompt ── */}
        {step === 'prompt' && (
          <>
            {/* Header */}
            <div style={{ padding: '30px 28px 2px', textAlign: 'center', position: 'relative' }}>
              <button
                onClick={dismiss}
                aria-label="Close"
                style={{
                  position: 'absolute', top: '12px', right: '12px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted)', padding: '6px', borderRadius: '8px',
                }}
              >
                <X size={18} />
              </button>

              <div style={{
                width: '60px', height: '60px', margin: '0 auto 14px',
                borderRadius: '50%', background: 'rgba(22,163,74,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MapPin size={26} color="var(--primary)" />
              </div>

              <h2 style={{ fontSize: '19px', fontWeight: '800', marginBottom: '6px', letterSpacing: '-0.2px' }}>
                Where are you playing?
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: '1.5' }}>
                Pick your city to see venues near you
              </p>
            </div>

            {/* Buttons */}
            <div style={{ padding: '20px 24px 18px' }}>
              <button
                onClick={handleDetect}
                className="btn-primary"
                style={{
                  width: '100%', padding: '14px', borderRadius: '13px',
                  fontSize: '15px', fontWeight: '700', marginBottom: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
                }}
              >
                <LocateFixed size={19} /> Detect My Location
              </button>

              <button
                onClick={() => setStep('city')}
                style={{
                  width: '100%', padding: '13px', borderRadius: '13px',
                  border: '1.5px solid var(--glass-border)', background: 'var(--glass-bg)',
                  fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                  fontFamily: 'inherit', color: 'var(--foreground)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
                }}
              >
                <MapPin size={17} color="var(--primary)" /> Choose City Manually
              </button>

              {/* Footer: don't show again + dismiss */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', gap: '8px' }}>
                <label
                  htmlFor="loc-never-again"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    cursor: 'pointer', fontSize: '13px', color: 'var(--muted)',
                    userSelect: 'none',
                  }}
                >
                  <input
                    id="loc-never-again"
                    type="checkbox"
                    checked={neverAgain}
                    onChange={e => setNeverAgain(e.target.checked)}
                    style={{ width: '15px', height: '15px', accentColor: 'var(--primary)', cursor: 'pointer', margin: 0 }}
                  />
                  Don&apos;t show again
                </label>

                <button
                  onClick={dismiss}
                  style={{
                    background: 'none', border: 'none', color: 'var(--muted)',
                    cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
                    fontWeight: '500', padding: '4px 2px',
                  }}
                >
                  Not now
                </button>
              </div>
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
