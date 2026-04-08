'use client';

import React, { useState } from 'react';
import { CITIES, SPORTS, MOCK_VENUES } from '@/lib/mockData';
import { Search, MapPin, Filter, Star } from 'lucide-react';
import VenueCard from '@/components/VenueCard/VenueCard';

export default function ExplorePage() {
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedSport, setSelectedSport] = useState('All Sports');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVenues = MOCK_VENUES.filter(venue => {
    const matchesCity = selectedCity === 'All Cities' || venue.city === selectedCity;
    const matchesSport = selectedSport === 'All Sports' || venue.sportTypes.includes(selectedSport);
    const matchesSearch = venue.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          venue.area.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCity && matchesSport && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Find Sports Near You</h1>
        <p style={{ color: 'var(--muted)' }}>Discovery the best venues for your favorite sports.</p>
      </header>

      {/* Filters Bar */}
      <div className="glass-morphism" style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} size={18} />
          <input 
            type="text" 
            placeholder="Search venue or area..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px 12px 12px 40px', 
              background: 'var(--secondary)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '8px',
              color: 'var(--foreground)',
              fontSize: '15px'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <select 
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{ 
              padding: '12px', 
              background: 'var(--secondary)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '8px',
              color: 'var(--foreground)'
            }}
          >
            <option>All Cities</option>
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>

          <select 
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            style={{ 
              padding: '12px', 
              background: 'var(--secondary)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '8px',
              color: 'var(--foreground)'
            }}
          >
            <option>All Sports</option>
            {SPORTS.map(s => <option key={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {filteredVenues.length > 0 ? filteredVenues.map(venue => (
          <VenueCard key={venue.id} venue={venue} />
        )) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
            No venues found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
