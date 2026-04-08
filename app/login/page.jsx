'use client';

import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      alert('Invalid email or password');
    } else {
      router.push('/');
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
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Welcome Back</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Sign in to book your favorite arenas.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--muted)' }}>Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ 
                width: '100%', 
                padding: '12px', 
                background: 'var(--secondary)', 
                border: '1px solid var(--glass-border)', 
                borderRadius: '8px',
                color: 'var(--foreground)'
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
                width: '100%', 
                padding: '12px', 
                background: 'var(--secondary)', 
                border: '1px solid var(--glass-border)', 
                borderRadius: '8px',
                color: 'var(--foreground)'
              }}
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ padding: '14px', marginTop: '8px' }}>
            Sign In
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--muted)' }}>
          Don't have an account? <Link href="/register" style={{ color: 'var(--primary)', fontWeight: '500' }}>Sign up</Link>
        </div>
      </div>
    </div>
  );
}
