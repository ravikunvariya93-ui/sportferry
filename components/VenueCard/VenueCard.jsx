import React from 'react';
import { MapPin, Star } from 'lucide-react';
import Link from 'next/link';

export default function VenueCard({ venue }) {
  return (
    <div className="glass-morphism" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '200px', position: 'relative' }}>
        <img src={venue.images[0] || 'https://via.placeholder.com/400x300'} alt={venue.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ 
          position: 'absolute', 
          top: '12px', 
          right: '12px', 
          background: 'rgba(0,0,0,0.6)', 
          padding: '4px 8px', 
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '14px'
        }}>
          <Star size={14} color="#fbbf24" fill="#fbbf24" /> {venue.rating}
        </div>
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{venue.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '14px', marginBottom: '12px' }}>
          <MapPin size={14} /> {venue.area}, {venue.city}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {venue.sportTypes.map(s => (
            <span key={s} style={{ 
              fontSize: '12px', 
              background: 'var(--glass-bg)', 
              padding: '2px 8px', 
              borderRadius: '4px',
              border: '1px solid var(--glass-border)'
            }}>{s}</span>
          ))}
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>₹{venue.pricePerHour}<span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: '400' }}>/hr</span></span>
          <Link href={`/venue/${venue.id}`} className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px', display: 'inline-block' }}>
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
