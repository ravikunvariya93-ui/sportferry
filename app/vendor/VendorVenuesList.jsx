'use client';

import React, { useState } from 'react';
import { Plus, MapPin, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import VenueModal from '@/components/VenueModal';
import { useRouter } from 'next/navigation';

export default function VendorVenuesList({ venues }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);

  const handleDeleteVenue = async (venueId) => {
    if (!window.confirm('Are you sure you want to delete this venue? This will also delete all associated bookings.')) {
      return;
    }
    try {
      const res = await fetch(`/api/venues/${venueId}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete venue.');
      }
    } catch {
      alert('Network error. Failed to delete venue.');
    }
  };

  return (
    <>
      {showModal && <VenueModal onClose={() => setShowModal(false)} />}
      {editingVenue && <VenueModal editingVenue={editingVenue} onClose={() => setEditingVenue(null)} />}

      <section className="glass-morphism" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Your Venues ({venues.length})</h2>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', fontWeight: '600' }}
          >
            <Plus size={18} /> Register New Venue
          </button>
        </div>

        {venues.length === 0 ? (
          <div style={{ color: 'var(--muted)', padding: '24px', textAlign: 'center', background: 'var(--secondary)', borderRadius: '12px' }}>
            No venues yet. Register your first venue to get started!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {venues.map(venue => (
              <div key={venue.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--secondary)', borderRadius: '14px', border: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
                <img
                  src={venue.images[0] || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=200'}
                  alt={venue.name}
                  style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }}
                />
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <Link href={`/venue/${venue.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{venue.name}</h3>
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>
                    <MapPin size={13} /> {venue.area}, {venue.city}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {venue.sportTypes.map(s => (
                      <span key={s} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(22,163,74,0.1)', color: 'var(--primary)', fontWeight: '600' }}>{s}</span>
                    ))}
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: 'var(--glass-bg)', color: 'var(--muted)', fontWeight: '600', border: '1px solid var(--glass-border)' }}>{venue.numberOfTurfs || 1} Turf{(venue.numberOfTurfs || 1) !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Price / hr</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>₹{venue.pricePerHour}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setEditingVenue(venue)}
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--muted)', cursor: 'pointer' }}
                      title="Edit Venue"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteVenue(venue.id || venue._id)}
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer' }}
                      title="Delete Venue"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
