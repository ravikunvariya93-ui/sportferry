'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Star, LayoutGrid, ArrowRight } from 'lucide-react';
import { discountPercentOf, discountedPrice } from '@/lib/pricing';

const CITY_KEY = 'sportferry_city';

function cityMatches(venueCity, selected) {
  const a = (venueCity || '').toLowerCase();
  const b = (selected || '').toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

function FeaturedCard({ venue }) {
  const rating = venue.rating || 0;
  const ratingColor = rating >= 4 ? '#16a34a' : rating > 0 ? '#d97706' : '#94a3b8';
  const discount = discountPercentOf(venue);
  const finalPrice = discountedPrice(venue.pricePerHour, discount);

  return (
    <Link
      href={`/venue/${venue.id}`}
      style={{
        flex: '0 0 260px',
        background: 'var(--secondary)',
        border: '1px solid var(--glass-border)',
        borderRadius: '16px',
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div style={{ position: 'relative', height: 150, overflow: 'hidden' }}>
        <img
          src={venue.images?.[0] || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=600'}
          alt={venue.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <span style={{
          position: 'absolute', top: 10, right: 10,
          background: ratingColor, color: '#fff',
          padding: '3px 10px', borderRadius: '100px',
          display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: 12, fontWeight: 800,
        }}>
          {rating > 0 ? (<><Star size={12} fill="white" color="white" /> {rating.toFixed(1)}</>) : 'New'}
        </span>
        {discount > 0 && (
          <span style={{
            position: 'absolute', top: 10, left: 10,
            background: '#ef4444', color: '#fff', padding: '3px 10px', borderRadius: '100px',
            fontSize: 12, fontWeight: 800, letterSpacing: '0.2px',
          }}>
            {discount}% OFF
          </span>
        )}
      </div>

      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{venue.name}</h3>

        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--muted)' }}>
          <MapPin size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} /> {venue.area}, {venue.city}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
            <LayoutGrid size={13} style={{ color: 'var(--primary)' }} /> {venue.numberOfTurfs || 1} turf{(venue.numberOfTurfs || 1) !== 1 ? 's' : ''}
          </span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>₹{finalPrice}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>/hr</span>
            {discount > 0 && <span style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'line-through' }}>₹{venue.pricePerHour}</span>}
          </span>
        </div>

        <span style={{
          display: 'block', textAlign: 'center',
          background: 'var(--primary)', color: '#fff',
          padding: '11px', borderRadius: '10px',
          fontSize: 13, fontWeight: 800,
        }}>
          Book Now
        </span>
      </div>
    </Link>
  );
}

export default function FeaturedVenues({ venues }) {
  const [city, setCity] = useState(null);

  useEffect(() => {
    const read = () => localStorage.getItem(CITY_KEY);
    setCity(read());

    const onSet = (e) => setCity(e.detail?.city || read());
    const onReset = () => setCity(read());
    window.addEventListener('sportferry:citySet', onSet);
    window.addEventListener('sportferry:resetLocation', onReset);
    return () => {
      window.removeEventListener('sportferry:citySet', onSet);
      window.removeEventListener('sportferry:resetLocation', onReset);
    };
  }, []);

  const sorted = [...venues].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const inCity = city ? sorted.filter(v => cityMatches(v.city, city)) : sorted;
  const list = city && inCity.length > 0 ? inCity : sorted;
  const featured = list.slice(0, 8);

  if (featured.length === 0) return null;

  const heading = city && inCity.length > 0 ? `Top Venues in ${city}` : 'Top Rated Venues';

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>{heading}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>Highest-rated turfs to book right now</p>
        </div>
        <Link href="/explore" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          See All <ArrowRight size={14} />
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
        {featured.map(venue => (
          <FeaturedCard key={venue.id} venue={venue} />
        ))}
      </div>
    </section>
  );
}
