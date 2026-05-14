import React from 'react';
import dbConnect from '@/lib/mongodb';
import UserDoc from '@/models/User';
import { notFound } from 'next/navigation';
import { User2, Calendar, MapPin, Shield } from 'lucide-react';

export default async function PublicProfilePage({ params }) {
  await dbConnect();
  const user = await UserDoc.findById(params.id).lean();

  if (!user) {
    notFound();
  }

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ background: 'white', borderRadius: '24px', padding: '40px', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
            <User2 size={48} />
          </div>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>{user.name}</h1>
            <div style={{ display: 'flex', gap: '16px', color: '#6b7280', fontSize: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={16} /> {user.city || 'Not specified'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Shield size={16} /> {user.role}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '16px', border: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Member Since</div>
            <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={18} color="#16a34a" /> {new Date(user.createdAt).toLocaleDateString()}</div>
          </div>
          <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '16px', border: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Verification</div>
            <div style={{ fontWeight: '600', color: '#16a34a' }}>Verified Athlete</div>
          </div>
        </div>
      </div>
    </div>
  );
}
