import React from 'react';
import { CITIES, SPORTS, MOCK_VENUES } from '@/lib/mockData';
import { MapPin, Star, Trophy, ArrowRight, Building } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import VenueCard from '@/components/VenueCard/VenueCard';

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
      {/* Hero Section */}
      <section style={{ 
        height: '400px', 
        position: 'relative', 
        borderRadius: '24px', 
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        padding: '60px',
        backgroundColor: 'var(--secondary)',
        border: '1px solid var(--glass-border)',
        backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.9) 40%, rgba(255, 255, 255, 0) 100%), url(/assets/hero-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
      }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: '700', marginBottom: '16px', lineHeight: 1.2 }}>
            Your Game, <span style={{ color: 'var(--primary)' }}>Your Ground.</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--muted)', marginBottom: '32px' }}>
            Book the best sports venues in your city in seconds. From box cricket to football turfs, we've got it all.
          </p>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            <Link href="/explore" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 28px', fontSize: '18px', fontWeight: '600' }}>
              Book a Court Now <ArrowRight size={20} />
            </Link>
            <Link href="/register" style={{ 
              background: 'rgba(255, 255, 255, 0.8)', 
              color: 'var(--foreground)', 
              padding: '14px 28px', 
              borderRadius: '8px', 
              border: '1px solid rgba(0,0,0,0.1)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(12px)'
            }}>
              <Building size={20} /> Register as Vendor
            </Link>
          </div>
        </div>
        {/* Decorative elements or background image would go here */}
      </section>

      {/* Select City Section */}
      <section>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MapPin size={24} color="var(--primary)" />
          Explore by City
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
          {CITIES.map(city => (
            <div key={city} className="glass-morphism" style={{ 
              padding: '16px', 
              textAlign: 'center', 
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              border: '1px solid var(--glass-border)'
            }}>
              {city}
            </div>
          ))}
        </div>
      </section>

      {/* Popular Sports */}
      <section>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Trophy size={24} color="var(--primary)" />
          Popular Sports
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px' }}>
          {SPORTS.map(sport => (
            <div key={sport.id} className="glass-morphism" style={{ 
              overflow: 'hidden', 
              cursor: 'pointer',
              height: '240px',
              position: 'relative'
            }}>
              <img src={sport.image} alt={sport.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
              <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 1, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '600' }}>{sport.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Venues */}
      <section>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Star size={24} color="var(--primary)" />
          Top Rated Grounds
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {MOCK_VENUES.map(venue => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      </section>
    </div>
  );
}
