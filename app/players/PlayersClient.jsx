'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Users, MapPin, Calendar, Search, UserPlus, MessageCircle } from 'lucide-react';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
}

export default function PlayersClient({ players, currentUserId }) {
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [searchQuery, setSearchQuery] = useState('');

  const cities = [...new Set(players.map(p => p.city).filter(Boolean))].sort();

  const filteredPlayers = players.filter(p => {
    const matchesCity = selectedCity === 'All Cities' || p.city === selectedCity;
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCity && matchesSearch;
  });

  // Group by city
  const groupedByCity = filteredPlayers.reduce((acc, player) => {
    const city = player.city;
    if (!acc[city]) acc[city] = [];
    acc[city].push(player);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px 80px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ 
          display: 'inline-flex', 
          padding: '12px', 
          background: 'rgba(34,197,94,0.1)', 
          borderRadius: '16px', 
          marginBottom: '16px' 
        }}>
          <Users size={32} color="#22c55e" />
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '8px' }}>
          Find Players
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px' }}>
          Connect with {players.length} player{players.length !== 1 ? 's' : ''} across Gujarat
        </p>
      </div>

      {/* Search & Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '32px',
        flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
          <Search size={16} style={{ 
            position: 'absolute', 
            left: '14px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
          }} />
          <input
            type="text"
            placeholder="Search by name or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px 12px 42px',
              background: 'var(--secondary)',
              border: '1px solid var(--glass-border)',
              borderRadius: '12px',
              color: 'var(--foreground)',
              fontFamily: 'inherit',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* City Filter */}
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          style={{
            padding: '12px 14px',
            background: 'var(--secondary)',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            color: 'var(--foreground)',
            fontFamily: 'inherit',
            fontSize: '14px',
            cursor: 'pointer',
            minWidth: '150px',
          }}
        >
          <option value="All Cities">All Cities</option>
          {cities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {/* City Pills */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px', 
        overflowX: 'auto',
        paddingBottom: '8px',
        scrollbarWidth: 'none',
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
          All ({players.length})
        </button>
        {cities.map(city => {
          const count = players.filter(p => p.city === city).length;
          return (
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
              {city} ({count})
            </button>
          );
        })}
      </div>

      {/* Players Grid */}
      {filteredPlayers.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {Object.entries(groupedByCity).map(([city, cityPlayers]) => (
            <div key={city}>
              {/* City Header */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '16px',
              }}>
                <MapPin size={16} style={{ color: 'var(--primary)' }} />
                <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
                  {city}
                </h2>
                <span style={{ 
                  fontSize: '12px', 
                  color: 'var(--muted)', 
                  background: 'var(--secondary)',
                  padding: '2px 8px',
                  borderRadius: '100px',
                }}>
                  {cityPlayers.length} player{cityPlayers.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Players in this city */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                gap: '12px',
              }}>
                {cityPlayers.map(player => (
                  <div
                    key={player.id}
                    style={{
                      background: 'var(--secondary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '14px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '700',
                      flexShrink: 0,
                    }}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link
                        href={`/profile/${player.id}`}
                        style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          marginBottom: '4px',
                          display: 'inline-block',
                          color: 'var(--foreground)',
                          textDecoration: 'none',
                        }}
                      >
                        {player.name}
                      </Link>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--muted)' }}>
                        <Calendar size={11} />
                        Joined {timeAgo(player.joined)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'rgba(34,197,94,0.1)',
                          border: '1px solid rgba(34,197,94,0.2)',
                          color: '#22c55e',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title="Invite to game"
                      >
                        <UserPlus size={16} />
                      </button>
                      <button
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'rgba(59,130,246,0.1)',
                          border: '1px solid rgba(59,130,246,0.2)',
                          color: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title="Message"
                      >
                        <MessageCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
          <Users size={48} style={{ color: 'var(--muted)', marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
            No players found
          </h3>
          <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>
            {searchQuery ? 'Try a different search term' : 'Be the first to set your city in your profile'}
          </p>
        </div>
      )}

      {/* Info note */}
      <div style={{ 
        marginTop: '32px', 
        padding: '16px', 
        background: 'rgba(34,197,94,0.08)', 
        border: '1px solid rgba(34,197,94,0.2)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <Users size={18} style={{ color: '#22c55e', flexShrink: 0, marginTop: '1px' }} />
        <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
          <strong style={{ color: 'var(--foreground)' }}>Coming soon:</strong> Direct messaging, team formation, 
          and skill-based matchmaking. For now, set your city in your profile to be discoverable by other players.
        </div>
      </div>
    </div>
  );
}
