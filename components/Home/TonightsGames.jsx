'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Clock, Users, Heart, ArrowRight } from 'lucide-react';
import { formatToAMPM, istHour, istTodayISO } from '@/lib/ist';
import { CITY_KEY, cityMatches } from '@/lib/location';
import { discountPercentOf, discountedPrice } from '@/lib/pricing';

function getDaypartWord() {
  const hour = istHour();
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  return 'Tonight';
}

export default function TonightsGames({ venues, venueGames = {}, date }) {
  const daypart = getDaypartWord();
  const dateStr = date || istTodayISO();
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

  const maxJoined = (v) => Math.max(...(venueGames[v.id] || [{ joined: 0 }]).map(s => s.joined));
  const games = venues
    .filter(v => venueGames[v.id] && venueGames[v.id].length > 0)
    .sort((a, b) => {
      const ra = nearbyCity && cityMatches(a.city, nearbyCity) ? 0 : 1;
      const rb = nearbyCity && cityMatches(b.city, nearbyCity) ? 0 : 1;
      return ra - rb || maxJoined(b) - maxJoined(a);
    })
    .slice(0, 8);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
          {daypart}&apos;s Games Near You
        </h2>
        <Link
          href="/explore"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            color: 'var(--primary)', fontSize: 13, fontWeight: 700,
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          See All <ArrowRight size={14} />
        </Link>
      </div>

      {games.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', background: 'var(--secondary)', border: '1px dashed var(--glass-border)', borderRadius: '16px', color: 'var(--muted)' }}>
          <Users size={34} style={{ opacity: 0.35, marginBottom: '10px' }} />
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--foreground)', marginBottom: '4px' }}>No games near you yet</div>
          <p style={{ fontSize: '13px', marginBottom: '18px' }}>Nothing lined up in the next few hours. Be the first to start a game.</p>
          <Link href="/explore" className="btn-primary" style={{ display: 'inline-block', padding: '11px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>Find a venue</Link>
        </div>
      ) : (
      <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
        {games.map((v) => {
          const slots = venueGames[v.id] || [];
          const bestSlot = slots.reduce((a, b) => (a.joined > b.joined ? a : b), slots[0]);
          const { startTime, endTime, joined, spotsLeft, maxPlayers = 12 } = bestSlot;
          const timeLabel = `${formatToAMPM(startTime)} – ${formatToAMPM(endTime)}`;
          const discount = discountPercentOf(v);
          const finalPrice = discountedPrice(v.pricePerHour, discount);
          const skill = (v.rating || 4.5) >= 4.5 ? 'Intermediate' : 'All Levels';
          const skillColor = skill === 'Intermediate' ? '#d97706' : '#16a34a';
          return (
            <Link
              key={v.id}
              href={`/venue/${v.id}?date=${dateStr}&slot=${encodeURIComponent(timeLabel)}`}
              style={{
                flex: '0 0 280px', background: 'var(--secondary)',
                border: '1px solid var(--glass-border)', borderRadius: '16px',
                overflow: 'hidden', textDecoration: 'none', color: 'inherit',
                display: 'flex', flexDirection: 'column',
              }}
            >
              <div style={{ position: 'relative', height: 150, overflow: 'hidden' }}>
                <img
                  src={v.images?.[0] || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=600'}
                  alt={v.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span style={{
                  position: 'absolute', top: 10, left: 10,
                  background: spotsLeft <= 3 ? '#ef4444' : '#22c55e',
                  color: spotsLeft <= 3 ? '#fff' : '#06130a',
                  padding: '3px 10px', borderRadius: '100px',
                  fontSize: 11, fontWeight: 800,
                }}>
                  {spotsLeft} SPOTS LEFT
                </span>
                <span style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.4)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                }}>
                  <Heart size={14} />
                </span>
                {discount > 0 && (
                  <span style={{
                    position: 'absolute', bottom: 10, right: 10,
                    background: '#ef4444', color: '#fff', padding: '3px 9px',
                    borderRadius: '100px', fontSize: 11, fontWeight: 800,
                  }}>
                    {discount}% OFF
                  </span>
                )}
              </div>

              <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{v.name}</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 12.5, color: 'var(--muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} /> {v.area}, {v.city}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} /> {timeLabel}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} /> {joined}/{maxPlayers} players
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>₹{finalPrice}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>/player</span>
                    {discount > 0 && <span style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'line-through' }}>₹{v.pricePerHour}</span>}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: skillColor,
                    background: `${skillColor}1a`, padding: '3px 9px', borderRadius: '100px',
                  }}>
                    {skill}
                  </span>
                </div>

                <span style={{
                  display: 'block', textAlign: 'center',
                  background: 'var(--primary)', color: '#fff',
                  padding: '11px', borderRadius: '10px',
                  fontSize: 13, fontWeight: 800,
                }}>
                  Join Game
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      )}
    </section>
  );
}
