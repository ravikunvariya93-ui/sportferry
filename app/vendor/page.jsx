import React from 'react';
import { LayoutDashboard, Plus, Users, Calendar, TrendingUp, MoreVertical, MapPin } from 'lucide-react';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import Booking from '@/models/Booking';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function VendorDashboard() {
  const session = await auth();
  
  if (!session || session.user.role !== 'VENDOR') {
    redirect('/login');
  }

  await dbConnect();
  const rawVenues = await Venue.find({ owner: session.user.id }).lean();
  
  const vendorVenues = rawVenues.map(v => ({
    ...v,
    _id: v._id.toString(),
    owner: v.owner.toString(),
    id: v._id.toString(),
  }));

  const venueIds = rawVenues.map(v => v._id);
  
  const rawBookings = await Booking.find({ venue: { $in: venueIds } })
    .populate('user')
    .populate('venue')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const recentBookings = rawBookings.map(b => ({
    id: b._id.toString(),
    userName: b.user ? b.user.name : 'Unknown User',
    userInitials: b.user ? b.user.name.substring(0, 2).toUpperCase() : '??',
    venueName: b.venue ? b.venue.name : 'Unknown Venue',
    dateStr: new Date(b.createdAt).toLocaleDateString(),
    amount: b.totalAmount
  }));
  
  const totalRevenue = rawBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalBookingsCount = await Booking.countDocuments({ venue: { $in: venueIds } });

  const stats = [
    { label: 'Total Revenue', value: `₹${totalRevenue}`, icon: TrendingUp, color: '#10b981' },
    { label: 'Total Bookings', value: totalBookingsCount.toString(), icon: Calendar, color: '#38bdf8' },
    { label: 'Active Venues', value: vendorVenues.length.toString(), icon: LayoutDashboard, color: '#fbbf24' },
    { label: 'Total Users', value: '0', icon: Users, color: '#f472b6' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Vendor Dashboard</h1>
          <p style={{ color: 'var(--muted)' }}>Manage your sports venues and track your performance.</p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Register New Venue
        </button>
      </header>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-morphism" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                backgroundColor: 'rgba(0,0,0,0.05)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: stat.color
              }}>
                <Icon size={24} />
              </div>
              <div>
                <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '4px' }}>{stat.label}</div>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>{stat.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        {/* Venues List */}
        <section className="glass-morphism" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>Your Venues</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {vendorVenues.length > 0 ? vendorVenues.map(venue => (
              <div key={venue.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                padding: '16px', 
                background: 'var(--secondary)', 
                borderRadius: '12px',
                border: '1px solid var(--glass-border)'
              }}>
                <img src={venue.images[0] || 'https://placehold.co/80x80/16a34a/FFF?text=Turf'} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{venue.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontSize: '13px' }}>
                    <MapPin size={14} /> {venue.area}, {venue.city}
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Today's Bookings</div>
                    <div style={{ fontWeight: '600' }}>4/12 slots</div>
                  </div>
                  <button style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>
            )) : <div style={{ color: 'var(--muted)', padding: '24px' }}>You haven't listed any venues yet.</div>}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="glass-morphism" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>Recent Bookings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {recentBookings.length > 0 ? recentBookings.map(booking => (
              <div key={booking.id} style={{ display: 'flex', gap: '12px', fontSize: '14px' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: 'var(--glass-bg)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: 'var(--primary)',
                  fontWeight: '600'
                }}>
                  {booking.userInitials}
                </div>
                <div>
                  <div style={{ fontWeight: '500' }}>{booking.userName} <span style={{ color: 'var(--muted)', fontWeight: '400' }}>booked</span> {booking.venueName}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '2px' }}>{booking.dateStr} • ₹{booking.amount}</div>
                </div>
              </div>
            )) : <div style={{ color: 'var(--muted)' }}>No recent bookings available.</div>}
            
            {recentBookings.length > 0 && (
              <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '500', fontSize: '14px', cursor: 'pointer', marginTop: '12px', textAlign: 'left' }}>
                View All Activity
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
