'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Trophy, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordForm() {
  const params = useSearchParams();
  const email = params.get('email') || '';
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const inputStyle = {
    width: '100%', padding: '13px 14px', background: 'var(--secondary)',
    border: '1.5px solid var(--glass-border)', borderRadius: '10px',
    color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '15px', outline: 'none',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      });
      const d = await res.json();
      if (res.ok) setDone(true);
      else setError(d.message || 'Reset failed.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const invalidLink = !email || !token;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="glass-morphism" style={{ padding: '40px', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary)' }}>
            <Trophy size={48} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Set a new password</h1>
          {!invalidLink && !done && (
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>for {email}</p>
          )}
        </div>

        {invalidLink ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '14px', color: '#dc2626', fontSize: '14px' }}>
            <AlertCircle size={16} /> This reset link is invalid. Please request a new one.
          </div>
        ) : done ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '10px', padding: '14px', color: 'var(--primary)', fontSize: '14px' }}>
            <CheckCircle2 size={16} /> Password reset! You can now sign in.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)', fontWeight: '600' }}>New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} required minLength={8} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)', fontWeight: '600' }}>Confirm new password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" style={inputStyle} required minLength={8} />
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 14px', color: '#dc2626', fontSize: '13px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '14px', marginTop: '4px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--muted)' }}>
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '500' }}>Back to sign in</Link>
        </div>
      </div>

      <style>{`input:focus { border-color: var(--primary) !important; }`}</style>
    </div>
  );
}
