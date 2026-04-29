'use client';

import React, { useState } from 'react';
import { Trophy, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn('credentials', {
      redirect: false,
      username,
      password,
    });

    if (result?.error) {
      setError('Invalid username or password');
      setLoading(false);
    } else {
      const session = await getSession();
      if (session?.user?.role === 'ADMIN') {
        router.push('/admin');
      } else if (session?.user?.role === 'VENDOR') {
        router.push('/vendor');
      } else {
        router.push('/');
      }
    }
  };

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    signIn('google', { callbackUrl: '/' });
  };

  const inputStyle = {
    width: '100%',
    padding: '13px 14px',
    background: 'var(--secondary)',
    border: '1.5px solid var(--glass-border)',
    borderRadius: '10px',
    color: 'var(--foreground)',
    fontFamily: 'inherit',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh'
    }}>
      <div className="glass-morphism" style={{ padding: '40px', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary)' }}>
            <Trophy size={48} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Welcome Back</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Sign in to book your favorite arenas.</p>
        </div>

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '13px 20px', borderRadius: '10px',
            border: '1.5px solid var(--glass-border)',
            background: 'var(--secondary)',
            color: 'var(--foreground)',
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', fontSize: '15px', fontWeight: '600',
            transition: 'all 0.2s ease',
            opacity: googleLoading ? 0.7 : 1,
            marginBottom: '24px',
          }}
        >
          <GoogleIcon />
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          marginBottom: '24px', color: 'var(--muted)', fontSize: '13px',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
          <span>or sign in with username</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)', fontWeight: '600' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)', fontWeight: '600' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              required
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '10px', padding: '12px 14px', color: '#dc2626', fontSize: '13px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              padding: '14px', marginTop: '4px',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--muted)' }}>
          Don't have an account? <Link href="/register" style={{ color: 'var(--primary)', fontWeight: '500' }}>Sign up</Link>
        </div>
      </div>

      <style>{`
        input:focus { border-color: var(--primary) !important; }
      `}</style>
    </div>
  );
}
