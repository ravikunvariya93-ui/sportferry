'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const CITIES = [
  { name: 'Mumbai', count: 12, image: 'https://images.unsplash.com/photo-1570160897040-30430ef2015a?q=80&w=400&h=300&fit=crop' },
  { name: 'Pune', count: 8, image: 'https://images.unsplash.com/photo-1595123550441-d377e017de6a?q=80&w=400&h=300&fit=crop' },
  { name: 'Bangalore', count: 15, image: 'https://images.unsplash.com/photo-1594246547146-24e6c0c2a265?q=80&w=400&h=300&fit=crop' },
  { name: 'Ahmedabad', count: 6, image: 'https://images.unsplash.com/photo-1623868615456-e766e01a8ef1?q=80&w=400&h=300&fit=crop' },
];

export default function HomeCitySelector() {
  const router = useRouter();
  const [activeCity, setActiveCity] = useState(null);

  useEffect(() => {
    setActiveCity(localStorage.getItem('sportferry_city'));
  }, []);

  const selectCity = (city) => {
    localStorage.setItem('sportferry_city', city);
    window.dispatchEvent(new Event('sportferry:citySet'));
    router.push(`/explore?city=${city}`);
  };

  return (
    <section style={{ padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>Popular Cities</h2>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>Find the best turfs in major cities</p>
        </div>
        <button 
          onClick={() => router.push('/explore')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', 
            fontWeight: '600', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' 
          }}
        >
          View All <ArrowRight size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
        {CITIES.map((city) => (
          <div 
            key={city.name}
            onClick={() => selectCity(city.name)}
            style={{ 
              position: 'relative', height: '160px', borderRadius: '20px', overflow: 'hidden', 
              cursor: 'pointer', transition: 'transform 0.3s ease'
            }}
            className="card-hover-effect"
          >
            <img 
              src={city.image} 
              alt={city.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            <div style={{ 
              position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '20px'
            }}>
              <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '700', marginBottom: '2px' }}>{city.name}</h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} /> {city.count}+ Venues
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
