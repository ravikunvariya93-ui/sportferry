'use client';

import React, { useState, useEffect } from 'react';
import { User, LogOut, Settings } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 9876543210');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--muted)', fontSize: '18px' }}>Checking session...</p>
      </div>
    );
  }

  if (!session) return null;

  const handleSave = (e) => {
    e.preventDefault();
    alert('Profile updated! (Simulated)');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>My Profile</h1>
          <p style={{ color: 'var(--muted)' }}>Manage your account settings.</p>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/' })} className="btn-primary" style={{ background: 'var(--card-bg)', color: '#ef4444', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <LogOut size={16} /> Sign Out
        </button>
      </header>

      <div className="glass-morphism" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '600' }}>
            {name.charAt(0)}
          </div>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '600' }}>{name || 'Loading...'}</h2>
            <p style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>{session?.user?.role?.toLowerCase() || 'Player'} Account</p>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--muted)' }}>Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '12px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--foreground)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--muted)' }}>Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '12px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--foreground)' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--muted)' }}>Phone Number</label>
            <input 
              type="text" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', padding: '12px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--foreground)' }}
            />
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" style={{ padding: '12px 24px' }}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
