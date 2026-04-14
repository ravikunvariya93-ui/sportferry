'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, LocateFixed, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import VenueCard from '@/components/VenueCard/VenueCard';

const CITY_KEY = 'sportferry_city';

export default function HomeRecommended({ allVenues }) {
  const [city, setCity]               = useState(null);
  const [nearbyVenues, setNearbyVenues] = useState([]);
  const [mounted, setMounted]           = useState(false);

  const applyCity = (cityName) => {
    if (!cityName) return;
    setCity(cityName);
    // Filter venues: match both ways for partial-name cases (e.g. "Surat" vs "Surat, India")
    const filtered = allVenues.filter(v => {
      const vCity = (v.city || '').toLowerCase();
      const dCity = cityName.toLowerCase();
      return vCity === dCity || vCity.includes(dCity) || dCity.includes(vCity);
    });
    setNearbyVenues(filtered.slice(0, 6));
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(CITY_KEY);
    if (saved) applyCity(saved);

    const onSet = (e) => applyCity(e.detail.city);
    const onReset = () => { setCity(null); setNearbyVenues([]); };

    window.addEventListener('sportferry:citySet',   onSet);
    window.addEventListener('sportferry:resetLocation', onReset);
    return () => {
      window.removeEventListener('sportferry:citySet',   onSet);
      window.removeEventListener('sportferry:resetLocation', onReset);
    };
  }, [allVenues]);

  // Don't render on the server (avoids SSR mismatch with localStorage)
  if (!mounted) return null;
  if (!city) return null;

  const handleChange = () => {
    window.dispatchEvent(new Event('sportferry:resetLocation'));
  };

  return (
    <section>
      {/* Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          {/* Location badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)',
            borderRadius: '100px', padding: '4px 12px',
            fontSize: '13px', fontWeight: '600', color: 'var(--primary)',
            marginBottom: '10px',
          }}>
            <MapPin size={13} fill="var(--primary)" color="var(--primary)" />
            {city}
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={22} color="var(--primary)" />
            Recommended for You
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleChange}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: '1px solid var(--glass-border)', borderRadius: '100px',
              padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '13px', fontWeight: '500', color: 'var(--muted)',
              transition: 'all 0.15s ease',
            }}
          >
            <LocateFixed size={13} /> Change Location
          </button>
          {nearbyVenues.length > 0 && (
            <Link href={`/?city=${encodeURIComponent(city)}`} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '14px', fontWeight: '600', color: 'var(--primary)',
            }}>
              See all <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>

      {/* Venues Grid or Empty State */}
      {nearbyVenues.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {nearbyVenues.map(venue => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      ) : (
        <div style={{
          padding: '48px 32px', textAlign: 'center',
          background: 'var(--secondary)', borderRadius: '20px',
          border: '1px dashed var(--glass-border)',
        }}>
          <MapPin size={36} style={{ color: 'var(--muted)', marginBottom: '14px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No venues near {city} yet</h3>
          <p style={{ color: 'var(--muted)', marginBottom: '20px', fontSize: '14px' }}>
            Be the first to list a venue in {city}!
          </p>
          <Link href="/" className="btn-primary" style={{ padding: '10px 24px', borderRadius: '10px', display: 'inline-block', fontSize: '14px' }}>
            Browse All Venues
          </Link>
        </div>
      )}
    </section>
  );
}
