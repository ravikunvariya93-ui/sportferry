'use client';

import React from 'react';
import Link from 'next/link';
import { Trophy, Calendar, MapPin, Users, Plus, AlertCircle, Clock } from 'lucide-react';

// Sample tournaments for demo (in production, these come from DB)
const SAMPLE_TOURNAMENTS = [
  {
    id: 'demo-1',
    name: 'Ahmedabad Box Cricket League',
    city: 'Ahmedabad',
    venue: 'Multiple Venues',
    startDate: '2026-10-15',
    endDate: '2026-10-20',
    registrationDeadline: '2026-10-10',
    maxTeams: 16,
    registeredTeams: 8,
    prize: '₹50,000',
    format: '6-a-side',
    entryFee: '₹2,000/team',
    status: 'REGISTRATION_OPEN',
  },
  {
    id: 'demo-2',
    name: 'Surat Corporate Cup',
    city: 'Surat',
    venue: 'Surat Sports Arena',
    startDate: '2026-10-25',
    endDate: '2026-10-27',
    registrationDeadline: '2026-10-20',
    maxTeams: 8,
    registeredTeams: 6,
    prize: '₹25,000',
    format: '5-a-side',
    entryFee: '₹1,500/team',
    status: 'REGISTRATION_OPEN',
  },
  {
    id: 'demo-3',
    name: 'Vadodara Weekend Warriors',
    city: 'Vadodara',
    venue: 'Green Field Turf',
    startDate: '2026-11-01',
    endDate: '2026-11-02',
    registrationDeadline: '2026-10-28',
    maxTeams: 12,
    registeredTeams: 12,
    prize: '₹15,000',
    format: '6-a-side',
    entryFee: '₹1,000/team',
    status: 'REGISTRATION_CLOSED',
  },
];

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short',
    year: 'numeric',
  });
}

function getStatusColor(status) {
  switch (status) {
    case 'REGISTRATION_OPEN': return '#22c55e';
    case 'REGISTRATION_CLOSED': return '#ef4444';
    case 'IN_PROGRESS': return '#3b82f6';
    case 'COMPLETED': return '#64748b';
    default: return '#64748b';
  }
}

export default function TournamentsClient({ tournaments }) {
  // Use sample data for now
  const displayTournaments = tournaments.length > 0 ? tournaments : SAMPLE_TOURNAMENTS;

  const upcomingTournaments = displayTournaments.filter(t => t.status !== 'COMPLETED');
  const pastTournaments = displayTournaments.filter(t => t.status === 'COMPLETED');

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px 80px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ 
          display: 'inline-flex', 
          padding: '12px', 
          background: 'rgba(234,179,8,0.1)', 
          borderRadius: '16px', 
          marginBottom: '16px' 
        }}>
          <Trophy size={32} color="#eab308" />
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '8px' }}>
          Tournaments
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', marginBottom: '24px' }}>
          Compete in box cricket tournaments across Gujarat
        </p>
        <Link
          href="/register"
          className="btn-primary"
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '12px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            textDecoration: 'none',
          }}
        >
          <Plus size={16} />
          Host a Tournament
        </Link>
      </div>

      {/* Upcoming Tournaments */}
      {upcomingTournaments.length > 0 && (
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} style={{ color: 'var(--primary)' }} />
            Upcoming Tournaments
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {upcomingTournaments.map(tournament => (
              <div
                key={tournament.id}
                style={{
                  background: 'var(--secondary)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                }}
              >
                {/* Status Banner */}
                <div style={{ 
                  background: getStatusColor(tournament.status),
                  color: 'white',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '700',
                  letterSpacing: '0.5px',
                }}>
                  {tournament.status === 'REGISTRATION_OPEN' ? '✓ REGISTRATIONS OPEN' : 
                   tournament.status === 'REGISTRATION_CLOSED' ? '✗ REGISTRATIONS CLOSED' :
                   tournament.status}
                </div>

                <div style={{ padding: '20px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                        {tournament.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontSize: '13px' }}>
                        <MapPin size={12} style={{ color: 'var(--primary)' }} />
                        {tournament.venue}, {tournament.city}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#eab308' }}>
                        {tournament.prize}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Prize Pool</div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                    gap: '12px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ padding: '12px', background: 'var(--background)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Dates</div>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>
                        {formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}
                      </div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--background)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Format</div>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{tournament.format}</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--background)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Entry Fee</div>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{tournament.entryFee}</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--background)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Teams</div>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>
                        {tournament.registeredTeams}/{tournament.maxTeams}
                      </div>
                    </div>
                  </div>

                  {/* Teams Progress */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                      <span>Team Registration</span>
                      <span>{tournament.registeredTeams}/{tournament.maxTeams} teams</span>
                    </div>
                    <div style={{ 
                      height: '8px', 
                      background: 'var(--glass-border)', 
                      borderRadius: '100px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(tournament.registeredTeams / tournament.maxTeams) * 100}%`,
                        background: tournament.registeredTeams >= tournament.maxTeams ? '#ef4444' : 'var(--primary)',
                        borderRadius: '100px',
                      }} />
                    </div>
                  </div>

                  {/* Action */}
                  {tournament.status === 'REGISTRATION_OPEN' && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button
                        className="btn-primary"
                        style={{ 
                          flex: 1, 
                          padding: '12px', 
                          borderRadius: '10px',
                          fontSize: '14px',
                        }}
                      >
                        Register Your Team
                      </button>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        Deadline: {formatDate(tournament.registrationDeadline)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {upcomingTournaments.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          background: 'var(--secondary)', 
          borderRadius: '20px',
          border: '1px solid var(--glass-border)',
          marginBottom: '48px',
        }}>
          <Trophy size={48} style={{ color: 'var(--muted)', marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
            No upcoming tournaments
          </h3>
          <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>
            Be the first to host a tournament in your city
          </p>
          <Link
            href="/register"
            className="btn-primary"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '12px',
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            <Plus size={16} />
            Host a Tournament
          </Link>
        </div>
      )}

      {/* Info note */}
      <div style={{ 
        padding: '16px', 
        background: 'rgba(234,179,8,0.08)', 
        border: '1px solid rgba(234,179,8,0.2)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <AlertCircle size={18} style={{ color: '#eab308', flexShrink: 0, marginTop: '1px' }} />
        <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
          <strong style={{ color: 'var(--foreground)' }}>Want to host a tournament?</strong> Contact us at 
          <a href="mailto:tournaments@sportferry.com" style={{ color: 'var(--primary)', marginLeft: '4px' }}>
            tournaments@sportferry.com
          </a> 
          . We&apos;ll help you organize, promote, and manage your box cricket tournament.
        </div>
      </div>
    </div>
  );
}
