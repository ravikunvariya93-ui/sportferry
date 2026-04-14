'use client';

import React from 'react';
import { MapPin, Star, Zap } from 'lucide-react';
import Link from 'next/link';

const SPORT_COLORS = {
  'Box Cricket':        '#16a34a',
  'Tennis Ball Cricket':'#0ea5e9',
  'Football':           '#f97316',
  'Badminton':          '#8b5cf6',
  'Tennis':             '#ec4899',
  'Table Tennis':       '#14b8a6',
};

export default function VenueCard({ venue }) {
  const fallbackImg = 'https://images.unsplash.com/photo-1529900948632-586bc48be71a?auto=format&fit=crop&q=80&w=600';

  return (
    <Link href={`/venue/${venue.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        borderRadius: '20px',
        overflow: 'hidden',
        background: 'var(--secondary)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        transition: 'all 0.25s ease',
        cursor: 'pointer',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.12)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)';
        }}
      >
        {/* Image Section */}
        <div style={{ height: '210px', position: 'relative', overflow: 'hidden' }}>
          <img
            src={venue.images?.[0] || fallbackImg}
            alt={venue.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)'
          }} />

          {/* Rating chip — top right */}
          <div style={{
            position: 'absolute', top: '12px', right: '12px',
            background: venue.rating >= 4 ? '#16a34a' : '#d97706',
            color: 'white', padding: '4px 10px', borderRadius: '100px',
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '13px', fontWeight: '700', backdropFilter: 'blur(4px)',
          }}>
            <Star size={12} fill="white" color="white" />
            {(venue.rating || 4.5).toFixed(1)}
          </div>

          {/* Sport badges — bottom left */}
          <div style={{ position: 'absolute', bottom: '12px', left: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {venue.sportTypes.slice(0, 2).map(s => (
              <span key={s} style={{
                background: SPORT_COLORS[s] || 'var(--primary)',
                color: 'white', padding: '3px 10px', borderRadius: '100px',
                fontSize: '11px', fontWeight: '700', letterSpacing: '0.3px',
              }}>
                {s}
              </span>
            ))}
            {venue.sportTypes.length > 2 && (
              <span style={{ background: 'rgba(0,0,0,0.5)', color: 'white', padding: '3px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: '600' }}>
                +{venue.sportTypes.length - 2}
              </span>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div style={{ padding: '16px 18px 18px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '5px', color: 'var(--foreground)', lineHeight: '1.3' }}>
            {venue.name}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontSize: '13px', marginBottom: '14px' }}>
            <MapPin size={13} style={{ flexShrink: 0, color: 'var(--primary)' }} />
            {venue.area}, {venue.city}
          </div>

          {/* Price + CTA */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)' }}>₹{venue.pricePerHour}</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: '400' }}>/hr</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--primary)', color: 'white',
              padding: '9px 16px', borderRadius: '10px',
              fontSize: '13px', fontWeight: '700',
            }}>
              <Zap size={14} />
              Book Now
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
