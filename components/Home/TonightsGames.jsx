import React from 'react';
import Link from 'next/link';
import { MapPin, Clock, Users, Heart, ArrowRight } from 'lucide-react';

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function spotsLeft(id) {
  return 12 - ((hash(id) % 6) + 5); // 2..7 spots left (12-player model)
}

export default function TonightsGames({ venues }) {
  const games = venues.slice(0, 8);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Tonight&apos;s Games Near You</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>Join a match and play with new people</p>
        </div>
        <Link href="/explore" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          See All <ArrowRight size={14} />
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
        {games.map((v) => {
          const spots = spotsLeft(v.id);
          const joined = 12 - spots;
          const skill = (v.rating || 4.5) >= 4.5 ? 'Intermediate' : 'All Levels';
          const skillColor = skill === 'Intermediate' ? '#d97706' : '#16a34a';
          return (
            <Link
              key={v.id}
              href={`/venue/${v.id}`}
              style={{
                flex: '0 0 280px',
                background: 'var(--secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                overflow: 'hidden',
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
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
                  background: '#22c55e', color: '#06130a',
                  padding: '3px 10px', borderRadius: '100px',
                  fontSize: 11, fontWeight: 800,
                }}>
                  {spots} SPOTS LEFT
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
              </div>

              <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{v.name}</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 12.5, color: 'var(--muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} /> {v.area}, {v.city}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} /> 6:00 PM – 9:00 PM
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} /> {joined}/12 players
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{v.pricePerHour}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>/hr</span>
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
    </section>
  );
}
