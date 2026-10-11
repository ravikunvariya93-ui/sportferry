'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Clock, Users, Star, Zap, AlertCircle } from 'lucide-react';
import { CITY_KEY, cityMatches } from '@/lib/location';
import { discountPercentOf, discountedPrice } from '@/lib/pricing';

export default function PlayNowClient({ games, date }) {
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [nearbyCity, setNearbyCity] = useState(null);

  useEffect(() => {
    const read = () => localStorage.getItem(CITY_KEY);
    setNearbyCity(read());
    const onSet = (e) => setNearbyCity(e.detail?.city || read());
    const onReset = () => setNearbyCity(read());
    window.addEventListener('sportferry:citySet', onSet);
    window.addEventListener('sportferry:resetLocation', onReset);
    return () => {
      window.removeEventListener('sportferry:citySet', onSet);
      window.removeEventListener('sportferry:resetLocation', onReset);
    };
  }, []);

  const cities = [...new Set(games.map(g => g.venueCity).filter(Boolean))].sort();
  const filteredGames = selectedCity === 'All Cities' 
    ? games 
    : games.filter(g => g.venueCity === selectedCity);
  // Games near the player's city come first, then the most urgent (fewest spots).
  const sortedGames = [...filteredGames].sort((a, b) => {
    const ra = nearbyCity && cityMatches(a.venueCity, nearbyCity) ? 0 : 1;
    const rb = nearbyCity && cityMatches(b.venueCity, nearbyCity) ? 0 : 1;
    return ra - rb || a.spotsLeft - b.spotsLeft;
  });

  const today = new Date().toLocaleDateString('en-IN', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'short' 
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px 80px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ 
          display: 'inline-flex', 
          padding: '12px', 
          background: 'rgba(249,115,22,0.1)', 
          borderRadius: '16px', 
          marginBottom: '16px' 
        }}>
          <Zap size={32} color="#f97316" />
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '8px' }}>
          Play Now
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', marginBottom: '4px' }}>
          Games happening in the next 2 hours
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          {today} • Join instantly, no team required
        </p>
      </div>

      {/* City Filter */}
      {cities.length > 0 && (
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '24px', 
          overflowX: 'auto',
          paddingBottom: '8px',
          scrollbarWidth: 'none'
        }}>
          <button
            onClick={() => setSelectedCity('All Cities')}
            style={{
              padding: '8px 16px',
              borderRadius: '100px',
              border: selectedCity === 'All Cities' ? '1.5px solid var(--primary)' : '1.5px solid var(--glass-border)',
              background: selectedCity === 'All Cities' ? 'var(--primary)' : 'var(--secondary)',
              color: selectedCity === 'All Cities' ? 'white' : 'var(--foreground)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            All Cities
          </button>
          {cities.map(city => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              style={{
                padding: '8px 16px',
                borderRadius: '100px',
                border: selectedCity === city ? '1.5px solid var(--primary)' : '1.5px solid var(--glass-border)',
                background: selectedCity === city ? 'var(--primary)' : 'var(--secondary)',
                color: selectedCity === city ? 'white' : 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {city}
            </button>
          ))}
        </div>
      )}

      {/* Games List */}
      {sortedGames.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sortedGames.map((game, idx) => (
            <Link
              key={`${game.venueId}-${game.startTime}`}
              href={`/venue/${game.venueId}?date=${date}&slot=${game.startTime}`}
              style={{
                display: 'flex',
                gap: '16px',
                background: 'var(--secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                padding: '16px',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              {/* Image */}
              <div style={{ 
                width: '120px', 
                height: '100px', 
                borderRadius: '12px', 
                overflow: 'hidden',
                flexShrink: 0,
                position: 'relative',
              }}>
                <img
                  src={game.venueImage || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=300'}
                  alt={game.venueName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Urgency badge */}
                {game.spotsLeft <= 3 && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: '#ef4444',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '100px',
                    fontSize: '10px',
                    fontWeight: '800',
                  }}>
                    {game.spotsLeft} LEFT
                  </div>
                )}
                {discountPercentOf(game) > 0 && (
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    background: '#ef4444',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '100px',
                    fontSize: '10px',
                    fontWeight: '800',
                  }}>
                    {discountPercentOf(game)}% OFF
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                      {game.venueName}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontSize: '13px' }}>
                      <MapPin size={12} style={{ color: 'var(--primary)' }} />
                      {game.venueArea}, {game.venueCity}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)' }}>
                      ₹{discountedPrice(game.pricePerHour, game.discountPercent)}
                      <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--muted)' }}>/hr</span>
                      {discountPercentOf(game) > 0 && (
                        <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--muted)', textDecoration: 'line-through', marginLeft: '6px' }}>
                          ₹{game.pricePerHour}
                        </span>
                      )}
                    </div>
                    {game.rating > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                        <Star size={11} fill="#f59e0b" color="#f59e0b" />
                        {game.rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: 'var(--muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} style={{ color: 'var(--primary)' }} />
                    {game.timeDisplay}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={13} style={{ color: 'var(--primary)' }} />
                    {game.playersCount}/{game.maxPlayers} players
                  </span>
                </div>

                {/* Spots indicator */}
                <div style={{ marginTop: 'auto' }}>
                  <div style={{ 
                    height: '6px', 
                    background: 'var(--glass-border)', 
                    borderRadius: '100px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${(game.playersCount / game.maxPlayers) * 100}%`,
                      background: game.spotsLeft <= 3 ? '#ef4444' : 'var(--primary)',
                      borderRadius: '100px',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <p style={{ fontSize: '11px', color: game.spotsLeft <= 3 ? '#ef4444' : 'var(--muted)', marginTop: '4px', fontWeight: '600' }}>
                    {game.spotsLeft} spot{game.spotsLeft !== 1 ? 's' : ''} available
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          background: 'var(--secondary)', 
          borderRadius: '20px',
          border: '1px solid var(--glass-border)',
        }}>
          <AlertCircle size={48} style={{ color: 'var(--muted)', marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
            No games in the next 2 hours
          </h3>
          <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>
            Be the first to create a game or book a venue for later
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/explore"
              className="btn-primary"
              style={{ padding: '12px 24px', borderRadius: '10px', fontSize: '14px' }}
            >
              Book a Ground
            </Link>
            <Link
              href="/register"
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '14px',
                background: 'var(--secondary)',
                border: '1px solid var(--glass-border)',
                color: 'var(--foreground)',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              Create a Game
            </Link>
          </div>
        </div>
      )}

      {/* Info note */}
      <div style={{ 
        marginTop: '32px', 
        padding: '16px', 
        background: 'rgba(59,130,246,0.08)', 
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <AlertCircle size={18} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '1px' }} />
        <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
          <strong style={{ color: 'var(--foreground)' }}>How it works:</strong> These are real games with available spots. 
          Click to view the venue and book your slot. You&apos;ll join the existing game automatically.
        </div>
      </div>
    </div>
  );
}
