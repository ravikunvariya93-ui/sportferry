'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, MapPin, LocateFixed, Loader2, X, SlidersHorizontal } from 'lucide-react';
import VenueCard from '@/components/VenueCard/VenueCard';

const SPORTS = ['Box Cricket', 'Tennis Ball Cricket', 'Football', 'Badminton', 'Tennis', 'Table Tennis'];

const SORT_OPTIONS = [
  { value: 'default',   label: 'Recommended' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating',    label: 'Top Rated' },
];

export default function ExploreClient({ initialVenues }) {
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery]     = useState('');
  const [selectedCity, setSelectedCity]   = useState('All Cities');
  const [selectedSport, setSelectedSport] = useState('All Sports');
  const [sortBy, setSortBy]               = useState('default');
  const [detectedCity, setDetectedCity]   = useState(null);
  const [geoState, setGeoState]           = useState('idle'); // idle | loading | success | denied
  const [showFilters, setShowFilters]     = useState(false);

  // Available cities from venues
  const availableCities = [...new Set(initialVenues.map(v => v.city).filter(Boolean))].sort();

  // Sync URL params on mount
  useEffect(() => {
    const cityParam  = searchParams.get('city');
    const sportParam = searchParams.get('sport');
    if (cityParam)  setSelectedCity(cityParam);
    if (sportParam) setSelectedSport(sportParam);
  }, [searchParams]);

  // Geolocation + reverse geocode
  const detectLocation = useCallback(() => {
    if (!navigator?.geolocation) {
      setGeoState('denied');
      return;
    }
    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          // Try progressively: city > town > county > state_district
          const rawCity =
            data.address?.city ||
            data.address?.town ||
            data.address?.county ||
            data.address?.state_district ||
            null;

          if (!rawCity) { setGeoState('denied'); return; }

          // Try to match against an actual city in our venue DB
          const matched = availableCities.find(c =>
            c.toLowerCase() === rawCity.toLowerCase() ||
            rawCity.toLowerCase().includes(c.toLowerCase()) ||
            c.toLowerCase().includes(rawCity.toLowerCase())
          );

          const cityToSet = matched || rawCity;
          setDetectedCity(cityToSet);
          setSelectedCity(matched || 'All Cities');
          setGeoState('success');
        } catch {
          setGeoState('denied');
        }
      },
      () => setGeoState('denied'),
      { timeout: 8000 }
    );
  }, [availableCities]);

  // Filtering + sorting
  const processedVenues = initialVenues
    .filter(venue => {
      const matchesCity  = selectedCity === 'All Cities' || venue.city === selectedCity;
      const matchesSport = selectedSport === 'All Sports' || venue.sportTypes?.includes(selectedSport);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || [venue.name, venue.area, venue.city, ...(venue.sportTypes || [])]
        .some(f => f?.toLowerCase().includes(q));
      return matchesCity && matchesSport && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc')  return a.pricePerHour - b.pricePerHour;
      if (sortBy === 'price_desc') return b.pricePerHour - a.pricePerHour;
      if (sortBy === 'rating')     return (b.rating || 0) - (a.rating || 0);
      return 0;
    });

  const clearAll = () => {
    setSearchQuery('');
    setSelectedCity('All Cities');
    setSelectedSport('All Sports');
    setSortBy('default');
    setDetectedCity(null);
    setGeoState('idle');
  };

  const hasActiveFilters = selectedCity !== 'All Cities' || selectedSport !== 'All Sports' || searchQuery || sortBy !== 'default';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Section Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>
          {geoState === 'success' && detectedCity
            ? <>All Venues near <span style={{ color: 'var(--primary)' }}>{detectedCity}</span></>
            : 'All Venues'
          }
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          {processedVenues.length} venue{processedVenues.length !== 1 ? 's' : ''} available
          {selectedCity !== 'All Cities' ? ` in ${selectedCity}` : ''}
        </p>
      </div>

      {/* Search + Geo Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} size={18} />
          <input
            type="text"
            placeholder="Search venue, area, sport…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '13px 14px 13px 44px',
              background: 'var(--secondary)', border: '1.5px solid var(--glass-border)',
              borderRadius: '14px', color: 'var(--foreground)', fontSize: '14px',
              fontFamily: 'inherit', outline: 'none',
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Use My Location Button */}
        <button
          onClick={detectLocation}
          disabled={geoState === 'loading'}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '13px 18px', borderRadius: '14px', fontFamily: 'inherit',
            fontSize: '14px', fontWeight: '600', cursor: geoState === 'loading' ? 'not-allowed' : 'pointer',
            border: geoState === 'success' ? '1.5px solid var(--primary)' : '1.5px solid var(--glass-border)',
            background: geoState === 'success' ? 'rgba(22,163,74,0.08)' : 'var(--secondary)',
            color: geoState === 'success' ? 'var(--primary)' : 'var(--foreground)',
            transition: 'all 0.2s ease',
          }}
        >
          {geoState === 'loading'
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Detecting…</>
            : geoState === 'success'
            ? <><MapPin size={16} /> {detectedCity || 'Near Me'}</>
            : <><LocateFixed size={16} /> Use My Location</>
          }
        </button>

        {/* Filters Toggle */}
        <button
          onClick={() => setShowFilters(s => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '13px 18px', borderRadius: '14px', fontFamily: 'inherit',
            fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            border: showFilters ? '1.5px solid var(--primary)' : '1.5px solid var(--glass-border)',
            background: showFilters ? 'rgba(22,163,74,0.08)' : 'var(--secondary)',
            color: showFilters ? 'var(--primary)' : 'var(--foreground)',
          }}
        >
          <SlidersHorizontal size={16} /> Filters {hasActiveFilters && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />}
        </button>
      </div>

      {/* Denied geolocation notice */}
      {geoState === 'denied' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '12px', padding: '12px 16px', color: '#92400e', fontSize: '13px' }}>
          <MapPin size={15} />
          Location access was denied or unavailable. Please select a city manually below.
        </div>
      )}

      {/* Expanded Filters Panel */}
      {showFilters && (
        <div className="glass-morphism" style={{ padding: '20px 24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* City */}
          <div style={{ flex: '1', minWidth: '160px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--muted)', marginBottom: '6px' }}>City</label>
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px' }}
            >
              <option value="All Cities">All Cities</option>
              {availableCities.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Sport */}
          <div style={{ flex: '1', minWidth: '160px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--muted)', marginBottom: '6px' }}>Sport</label>
            <select
              value={selectedSport}
              onChange={e => setSelectedSport(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px' }}
            >
              <option value="All Sports">All Sports</option>
              {SPORTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Sort */}
          <div style={{ flex: '1', minWidth: '160px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--muted)', marginBottom: '6px' }}>Sort By</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px' }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button onClick={clearAll} style={{ padding: '11px 18px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <X size={15} /> Clear All
            </button>
          )}
        </div>
      )}

      {/* Sport Quick Pills */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
        <button
          onClick={() => setSelectedSport('All Sports')}
          style={{
            padding: '8px 18px', borderRadius: '100px', whiteSpace: 'nowrap',
            border: selectedSport === 'All Sports' ? '1.5px solid var(--primary)' : '1.5px solid var(--glass-border)',
            background: selectedSport === 'All Sports' ? 'var(--primary)' : 'var(--secondary)',
            color: selectedSport === 'All Sports' ? 'white' : 'var(--foreground)',
            cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit',
          }}
        >All</button>
        {SPORTS.map(sport => (
          <button
            key={sport}
            onClick={() => setSelectedSport(sport)}
            style={{
              padding: '8px 18px', borderRadius: '100px', whiteSpace: 'nowrap',
              border: selectedSport === sport ? '1.5px solid var(--primary)' : '1.5px solid var(--glass-border)',
              background: selectedSport === sport ? 'var(--primary)' : 'var(--secondary)',
              color: selectedSport === sport ? 'white' : 'var(--foreground)',
              cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
          >{sport}</button>
        ))}
      </div>

      {/* Results Grid */}
      {processedVenues.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
          {processedVenues.map(venue => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '72px 20px', background: 'var(--secondary)', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
          <Search size={40} style={{ color: 'var(--muted)', marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>No venues found</h3>
          <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Try adjusting your filters or search a different area.</p>
          <button onClick={clearAll} className="btn-primary" style={{ padding: '11px 28px', borderRadius: '12px' }}>
            Clear All Filters
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
