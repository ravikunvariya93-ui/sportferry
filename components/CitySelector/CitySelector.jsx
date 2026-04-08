import React from 'react';

export default function CitySelector({ cities, selectedCity, onSelectCity }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
      <div 
        className="glass-morphism" 
        onClick={() => onSelectCity('All Cities')}
        style={{ 
          padding: '16px', 
          textAlign: 'center', 
          cursor: 'pointer',
          transition: 'transform 0.2s ease, background 0.2s ease',
          border: '1px solid var(--glass-border)',
          background: selectedCity === 'All Cities' ? 'var(--primary)' : 'var(--glass-bg)',
          color: selectedCity === 'All Cities' ? 'white' : 'inherit'
        }}
      >
        All Cities
      </div>
      {cities.map(city => (
        <div 
          key={city} 
          className="glass-morphism" 
          onClick={() => onSelectCity(city)}
          style={{ 
            padding: '16px', 
            textAlign: 'center', 
            cursor: 'pointer',
            transition: 'transform 0.2s ease, background 0.2s ease',
            border: '1px solid var(--glass-border)',
            background: selectedCity === city ? 'var(--primary)' : 'var(--glass-bg)',
            color: selectedCity === city ? 'white' : 'inherit'
          }}
        >
          {city}
        </div>
      ))}
    </div>
  );
}
