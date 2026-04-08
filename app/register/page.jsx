'use client';

import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      if (res.ok) {
        router.push('/login');
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Registration failed');
      }
    } catch (error) {
      console.error('An error occurred', error);
      alert('An error occurred during registration');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '80vh' 
    }}>
      <div className="glass-morphism" style={{ padding: '40px', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary)' }}>
            <Trophy size={48} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Create an Account</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Join Sportferry to play or host.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
            <button 
              type="button"
              onClick={() => setRole('USER')}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500',
                background: role === 'USER' ? 'var(--primary)' : 'var(--secondary)',
                color: role === 'USER' ? 'white' : 'var(--foreground)',
                border: '1px solid var(--glass-border)'
              }}
            >
              Player
            </button>
            <button 
              type="button"
              onClick={() => setRole('VENDOR')}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500',
                background: role === 'VENDOR' ? 'var(--primary)' : 'var(--secondary)',
                color: role === 'VENDOR' ? 'white' : 'var(--foreground)',
                border: '1px solid var(--glass-border)'
              }}
            >
              Ground Owner
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--muted)' }}>Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              style={{ 
                width: '100%', padding: '12px', background: 'var(--secondary)', 
                border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--foreground)'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--muted)' }}>Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ 
                width: '100%', padding: '12px', background: 'var(--secondary)', 
                border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--foreground)'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--muted)' }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ 
                width: '100%', padding: '12px', background: 'var(--secondary)', 
                border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--foreground)'
              }}
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ padding: '14px', marginTop: '8px' }}>
            Sign Up
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--muted)' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '500' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
