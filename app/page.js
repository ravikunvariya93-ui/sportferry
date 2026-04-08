import React from 'react';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import { MapPin, Star, Trophy, ArrowRight, Building, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import VenueCard from '@/components/VenueCard/VenueCard';
import styles from './page.module.css';

export default async function Home() {
  await dbConnect();
  
  // Natively pull data
  const rawVenues = await Venue.find({}).limit(6).lean();
  const activeCities = await Venue.distinct('city');
  const availableSports = await Venue.distinct('sportTypes');
  
  // Serialize ObjectIds for Client Component consumption
  const featuredVenues = rawVenues.map(v => ({
    ...v,
    _id: v._id.toString(),
    owner: v.owner.toString(),
    id: v._id.toString(), 
  }));


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', paddingBottom: '80px' }}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Your Game, <span style={{ color: 'var(--primary)' }}>Your Ground.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Book the best sports venues in your city in seconds. From box cricket to football turfs, we've got it all perfectly mapped out for you.
          </p>
          <div className={styles.heroButtons}>
            <Link href="/explore" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 28px', fontWeight: '600', borderRadius: '12px' }}>
              Book a Court Now <ArrowRight size={20} />
            </Link>
            <Link href="/register" style={{ 
              background: 'rgba(255, 255, 255, 0.8)', 
              color: 'var(--foreground)', 
              padding: '14px 28px', 
              borderRadius: '12px', 
              border: '1px solid rgba(0,0,0,0.1)',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(12px)'
            }}>
              <Building size={20} /> Register as Vendor
            </Link>
          </div>
        </div>
      </section>

      {/* Select City Section (Live Data) */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
            <MapPin size={24} color="var(--primary)" />
            Explore by Active Cities
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
          {activeCities.length > 0 ? activeCities.map(city => (
            <Link href={`/explore?city=${city}`} key={city} style={{ textDecoration: 'none' }}>
              <div className="glass-morphism hover-card" style={{ 
                padding: '16px 20px', 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                borderRadius: '16px',
                border: '1px solid var(--glass-border)',
                fontWeight: '600',
                fontSize: '15px',
                color: 'var(--foreground)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}>
                {city}
                <ChevronRight size={16} color="var(--primary)" />
              </div>
            </Link>
          )) : (
            <div style={{ color: 'var(--muted)', padding: '24px 0' }}>No active cities currently registered.</div>
          )}
        </div>
      </section>

      {/* Popular Sports (Simplified) */}
      <section>
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
          <Trophy size={24} color="var(--primary)" />
          Discover Sports
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
          {availableSports.length > 0 ? availableSports.map(sport => (
            <Link href={`/explore?sport=${sport}`} key={sport} style={{ textDecoration: 'none' }}>
              <div className="glass-morphism hover-card" style={{ 
                padding: '16px 20px', 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                borderRadius: '16px',
                border: '1px solid var(--glass-border)',
                fontWeight: '600',
                fontSize: '15px',
                color: 'var(--foreground)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}>
                {sport}
                <ChevronRight size={16} color="var(--primary)" />
              </div>
            </Link>
          )) : (
            <div style={{ color: 'var(--muted)', padding: '24px 0' }}>No sports have venues yet!</div>
          )}
        </div>
      </section>

      {/* Featured Venues */}
      <section>
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
          <Star size={24} color="var(--primary)" />
          Top Rated Grounds
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {featuredVenues.length > 0 ? featuredVenues.map(venue => (
            <VenueCard key={venue.id} venue={venue} />
          )) : (
            <div style={{ color: 'var(--muted)', gridColumn: '1 / -1' }}>No venues registered on the platform yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
