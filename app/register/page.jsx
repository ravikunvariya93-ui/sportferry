'use client';

import React, { useState } from 'react';
import { Trophy, AlertCircle, Users, Building2 } from 'lucide-react';
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

const ROLES = [
  { value: 'PLAYER', label: 'Player', desc: 'Book venues & join games', Icon: Users },
  { value: 'VENDOR', label: 'Ground Owner', desc: 'List venues & manage bookings', Icon: Building2 },
];

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('PLAYER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  const submitControllerRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (submitControllerRef.current) submitControllerRef.current.abort();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (submitControllerRef.current) submitControllerRef.current.abort();
    submitControllerRef.current = new AbortController();
    const signal = submitControllerRef.current.signal;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password, role }),
        signal,
      });

      if (res.ok) {
        // Sign the new account straight in and land them in the app, instead of
        // bouncing to /login for a second step.
        const result = await signIn('credentials', { redirect: false, username, password });
        if (result?.error) {
          router.push('/login');
        } else {
          const session = await getSession();
          if (session?.user?.role === 'VENDOR') router.push('/vendor');
          else router.push('/');
          router.refresh();
        }
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    setGoogleLoading(true);
    // Remember the chosen role so the Google callback can honour it (PLAYER/VENDOR).
    try {
      document.cookie = `sportferry_oauth_role=${role}; path=/; max-age=900; samesite=lax`;
    } catch { /* ignore */ }
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

  const roleLabel = role === 'VENDOR' ? 'Ground Owner' : 'Player';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh'
    }}>
      <div className="glass-morphism" style={{ padding: '40px', width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary)' }}>
            <Trophy size={48} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Create an Account</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Join Sportferry to play or host.</p>
        </div>

        {/* ── Step 1: who are you? (applies to both Google and email sign-up) ── */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)', fontWeight: '600' }}>
            I&apos;m joining as
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {ROLES.map(({ value, label, desc, Icon }) => {
              const active = role === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  aria-pressed={active}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    padding: '14px 8px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'center',
                    background: active ? 'var(--primary)' : 'var(--secondary)',
                    color: active ? 'white' : 'var(--foreground)',
                    border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--glass-border)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon size={20} />
                  <span style={{ fontSize: '14px', fontWeight: '700' }}>{label}</span>
                  <span style={{ fontSize: '10.5px', lineHeight: 1.3, opacity: active ? 0.9 : 0.65 }}>{desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Step 2a: Google ── */}
        <button
          onClick={handleGoogleSignUp}
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
          }}
        >
          <GoogleIcon />
          {googleLoading ? 'Redirecting…' : `Sign up as ${roleLabel} with Google`}
        </button>

        {/* ── Step 2b: email form ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          margin: '22px 0', color: 'var(--muted)', fontSize: '13px',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
          <span>or sign up with email</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)', fontWeight: '600' }}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)', fontWeight: '600' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a unique username"
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)', fontWeight: '600' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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
              minLength={8}
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '10px', padding: '12px 14px', color: '#dc2626', fontSize: '13px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ padding: '14px', marginTop: '4px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Creating account...' : `Create ${roleLabel} Account`}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--muted)' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '500' }}>Sign in</Link>
        </div>
      </div>

      <style>{`
        input:focus { border-color: var(--primary) !important; }
      `}</style>
    </div>
  );
}
