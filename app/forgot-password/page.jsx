'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Trophy, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { text, devResetUrl }
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const d = await res.json();
      if (res.ok) setMessage({ text: d.message, devResetUrl: d.devResetUrl });
      else setError(d.message || 'Something went wrong.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '13px 14px', background: 'var(--secondary)',
    border: '1.5px solid var(--glass-border)', borderRadius: '10px',
    color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '15px', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="glass-morphism" style={{ padding: '40px', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary)' }}>
            <Trophy size={48} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Reset your password</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Enter your email and we&apos;ll send you a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)', fontWeight: '600' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} required />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 14px', color: '#dc2626', fontSize: '13px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          {message && (
            <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '10px', padding: '12px 14px', color: 'var(--primary)', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} /> {message.text}
              </div>
              {message.devResetUrl && (() => {
                let href = message.devResetUrl;
                try { const u = new URL(message.devResetUrl); href = u.pathname + u.search; } catch { /* keep as-is */ }
                return (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)' }}>
                    Email isn&apos;t set up on this server, so here&apos;s your link:{' '}
                    <Link href={href} style={{ color: 'var(--primary)', fontWeight: '600' }}>Open reset link →</Link>
                  </div>
                );
              })()}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '14px', marginTop: '4px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--muted)' }}>
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '500' }}>Back to sign in</Link>
        </div>
      </div>

      <style>{`input:focus { border-color: var(--primary) !important; }`}</style>
    </div>
  );
}
