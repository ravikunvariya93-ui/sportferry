'use client';

import React, { useState } from 'react';
import { MapPin, Star, Clock, CheckCircle, Navigation, Info, Zap, Shield, CreditCard } from 'lucide-react';
import styles from './VenueDetail.module.css';
import { clsx } from 'clsx';

export default function VenueDetailClient({ venue }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const slots = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
  ];

  const mapQuery = encodeURIComponent(`${venue.area}, ${venue.city}, Sports`);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '120px' }}>
      
      {/* Cinematic Hero */}
      <section className={styles.hero}>
        <img 
          src={venue.images[0] || 'https://images.unsplash.com/photo-1529900948632-586bc48be71a?auto=format&fit=crop&q=80&w=1600'} 
          alt={venue.name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        {/* Gradient Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%)'
        }} />
        
        {/* Hero Content */}
        <div className={styles.heroContent}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {venue.sportTypes.map(s => (
              <span key={s} style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 'bold' }}>
                {s}
              </span>
            ))}
          </div>
          <h1 className={styles.heroTitle}>{venue.name}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px', fontSize: '15px', color: 'rgba(255,255,255,0.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={18} color="var(--primary)" /> {venue.area}, {venue.city}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={18} color="#fbbf24" fill="#fbbf24" /> 
              <span style={{ fontWeight: '600', color: 'white' }}>{venue.rating || 4.5}</span> (120 reviews)
            </div>
          </div>
        </div>
      </section>

      {/* Main Layout */}
      <div className={styles.mainGrid}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Tabbed Navigation */}
          <div className={styles.tabList}>
            {['overview', 'amenities', 'location'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={styles.tabButton}
                style={{
                  borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent',
                  color: activeTab === tab ? 'var(--foreground)' : 'var(--muted)',
                  fontWeight: activeTab === tab ? '600' : '400',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Dynamic Content Views */}
          <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            {activeTab === 'overview' && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>About this venue</h2>
                  <p style={{ color: 'var(--muted)', lineHeight: '1.8', fontSize: '16px' }}>
                    Welcome to {venue.name}, located in the heart of {venue.area}. Experience the best {venue.sportTypes[0]} games on our professionally maintained surfaces. Designed for players of all skill levels, we provide top-tier floodlights for night matches, ample parking, and an energetic atmosphere.
                  </p>
                </div>
                
                <div style={{ background: 'var(--glass-bg)', padding: '24px', borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={18} color="var(--primary)" /> Hours of Operation
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Everyday: 6:00 AM - 11:59 PM</div>
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Shield size={18} color="var(--primary)" /> Safety Rules
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Non-marking shoes only.</div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'amenities' && (
              <section>
                <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>What this place offers</h2>
                <div className={styles.amenitiesGrid}>
                  {(venue.amenities && venue.amenities.length > 0 ? venue.amenities : ['Parking', 'Drinking Water', 'Restrooms', 'Floodlights', 'Seating Area', 'Equipments Provided']).map(a => (
                    <div key={a} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--secondary)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(22, 163, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <CheckCircle size={20} color="var(--primary)" />
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: '500' }}>{a}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'location' && (
              <section>
                <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>Where you'll be</h2>
                <div style={{ color: 'var(--muted)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Navigation size={18} /> {venue.address}, {venue.city}
                </div>
                <div style={{ height: '350px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'var(--secondary)' }}>
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    marginHeight="0" 
                    marginWidth="0" 
                    src={`https://maps.google.com/maps?width=100%25&height=600&hl=en&q=${mapQuery}&t=&z=14&ie=UTF8&iwloc=B&output=embed`}
                  ></iframe>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Elevated Booking Sidebar */}
        <aside>
          <div className="glass-morphism" style={{ 
            padding: '24px', 
            position: 'sticky', 
            top: '80px', 
            borderRadius: '24px', 
            border: '2px solid var(--glass-border)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.06)'
          }}>
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: '800' }}>₹{venue.pricePerHour}</span>
              <span style={{ fontSize: '16px', color: 'var(--muted)' }}>/ hour</span>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Select Date</label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: 'var(--secondary)', 
                  border: '1px solid var(--glass-border)', 
                  borderRadius: '12px', 
                  color: 'var(--foreground)',
                  fontSize: '15px'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Available Time Slots</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {slots.map(slot => (
                  <button 
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    style={{ 
                      padding: '8px 4px', 
                      borderRadius: '8px', 
                      border: selectedSlot === slot ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                      background: selectedSlot === slot ? 'var(--primary)' : 'var(--secondary)',
                      color: selectedSlot === slot ? 'white' : 'var(--foreground)',
                      fontSize: '12px',
                      fontWeight: selectedSlot === slot ? '600' : '500',
                      cursor: 'pointer'
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: '600', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
               <Zap size={18} /> Checkout & Book
            </button>
          </div>
        </aside>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
