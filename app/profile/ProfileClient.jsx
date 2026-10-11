'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  User, Mail, Shield, ShieldCheck, Calendar, LogOut, Phone, ChevronRight, Trash2, AtSign,
  MapPin, LocateFixed, Loader2, Save, CheckCircle, AlertCircle,
  Pencil, X
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import LevelBadge from '@/components/Profile/LevelBadge';
import LevelProgress from '@/components/Profile/LevelProgress';
import PlayerStats from '@/components/Profile/PlayerStats';
import PlayerAchievements from '@/components/Profile/PlayerAchievements';

const STATUS_COLORS = {
  CONFIRMED: { bg: 'rgba(22,163,74,0.1)', color: '#16a34a', label: 'Confirmed' },
  PENDING: { bg: 'rgba(251,191,36,0.1)', color: '#d97706', label: 'Pending' },
  CANCELLED: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', label: 'Cancelled' },
};

export default function ProfileClient({ initialUser, bookingsSummary = { total: 0, upcoming: 0, past: 0 }, recentBookings = [], venueCount = 0, level = null, achievements = [], playerStats = { gamesPlayed: 0, upcoming: 0, venues: 0 } }) {
  const [user, setUser] = useState(initialUser);
  const [isEditing, setIsEditing] = useState(false);

  // Password change
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  // Delete account
  const [showDelete, setShowDelete] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState('');

  // Form state
  const [name, setName] = useState(initialUser.name);
  const [phone, setPhone] = useState(initialUser.phone || '');
  const [city, setCity] = useState(initialUser.city || '');

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { type: 'success' | 'error', text: string }

  // Location detection
  const [geoState, setGeoState] = useState('idle'); // idle | loading | success | denied
  const geoControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (geoControllerRef.current) geoControllerRef.current.abort();
    };
  }, []);

  const detectLocation = async () => {
    if (!navigator?.geolocation) {
      setGeoState('denied');
      return;
    }

    if (geoControllerRef.current) geoControllerRef.current.abort();
    geoControllerRef.current = new AbortController();
    const signal = geoControllerRef.current.signal;

    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
            { headers: { 'Accept-Language': 'en' }, signal }
          );
          const data = await res.json();
          const detected =
            data.address?.city ||
            data.address?.town ||
            data.address?.county ||
            data.address?.state_district ||
            null;

          if (detected) {
            setCity(detected);
            setGeoState('success');
          } else {
            setGeoState('denied');
          }
        } catch (err) {
          if (err.name === 'AbortError') return;
          setGeoState('denied');
        }
      },
      () => setGeoState('denied'),
      { timeout: 8000 }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, city }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(prev => ({ ...prev, name: data.user.name, phone: data.user.phone, city: data.user.city }));
        setSaveMsg({ type: 'success', text: 'Profile saved successfully!' });
        setIsEditing(false);
        // Also update localStorage city for home page recommendations
        if (data.user.city) {
          localStorage.setItem('sportferry_city', data.user.city);
          window.dispatchEvent(new CustomEvent('sportferry:citySet', { detail: { city: data.user.city } }));
        }
      } else {
        setSaveMsg({ type: 'error', text: data.message || 'Failed to save.' });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(user.name);
    setPhone(user.phone || '');
    setCity(user.city || '');
    setIsEditing(false);
    setSaveMsg(null);
    setGeoState('idle');
  };

  const changePassword = async () => {
    if (pwNew !== pwConfirm) { setPwMsg({ type: 'error', text: 'New passwords do not match.' }); return; }
    setPwSaving(true);
    setPwMsg(null);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const d = await res.json();
      if (res.ok) {
        setPwMsg({ type: 'success', text: d.message || 'Password updated.' });
        setPwCurrent(''); setPwNew(''); setPwConfirm('');
      } else {
        setPwMsg({ type: 'error', text: d.message || 'Failed to update password.' });
      }
    } catch {
      setPwMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setPwSaving(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteMsg('');
    try {
      const res = await fetch('/api/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePw }),
      });
      const d = await res.json();
      if (res.ok) {
        await signOut({ callbackUrl: '/' });
      } else {
        setDeleteMsg(d.message || 'Could not delete account.');
      }
    } catch {
      setDeleteMsg('Network error.');
    } finally {
      setDeleting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: 'var(--secondary)',
    border: '1.5px solid var(--glass-border)',
    borderRadius: '12px',
    color: 'var(--foreground)',
    fontSize: '15px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--muted)',
    marginBottom: '8px',
  };

  return (
    <main style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Header Card ── */}
      <div className="glass-morphism responsive-padding" style={{ padding: '40px', borderRadius: '24px' }}>
        <div className="responsive-flex-col" style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', flexShrink: 0,
            boxShadow: '0 8px 24px rgba(22,163,74,0.25)',
          }}>
            <User size={40} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '4px' }}>{user.name}</h1>
            {user.username && (
              <p style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', marginBottom: '2px' }}>
                <AtSign size={15} /> {user.username}
              </p>
            )}
            <p style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
              <Mail size={15} /> {user.email}
            </p>
            {user.city && (
              <p style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', marginTop: '4px' }}>
                <MapPin size={15} color="var(--primary)" /> {user.city}
              </p>
            )}
          </div>
          <LevelBadge level={level} />
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', borderRadius: '12px',
                border: '1.5px solid var(--glass-border)',
                background: 'var(--secondary)', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '14px', fontWeight: '600',
                color: 'var(--foreground)', transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Pencil size={16} /> Edit Profile
            </button>
          )}
        </div>

        {/* ── Info Cards ── */}
        <div className="responsive-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>

          <div style={{ padding: '20px', background: 'var(--secondary)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
            <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
              <Calendar size={14} /> Joined On
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700' }}>
              {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div style={{ padding: '20px', background: 'var(--secondary)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
            <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
              <MapPin size={14} /> Location
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: user.city ? 'var(--foreground)' : 'var(--muted)' }}>
              {user.city || 'Not set'}
            </div>
          </div>
          <div style={{ padding: '20px', background: 'var(--secondary)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
            <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
              <Phone size={14} /> Phone
            </div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: user.phone ? 'var(--foreground)' : 'var(--muted)' }}>
              {user.phone || 'Not set'}
            </div>
          </div>
        </div>

        <LevelProgress level={level} style={{ marginTop: 0 }} />

        {/* ── Edit Form (Expandable) ── */}
        {isEditing && (
          <div style={{
            borderTop: '1px solid var(--glass-border)', paddingTop: '28px',
            display: 'flex', flexDirection: 'column', gap: '20px',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pencil size={18} color="var(--primary)" /> Edit Your Information
            </h3>

            {/* Name */}
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                style={inputStyle}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={labelStyle}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  style={{ ...inputStyle, paddingLeft: '42px' }}
                />
              </div>
            </div>

            {/* City / Location */}
            <div>
              <label style={labelStyle}>City / Location</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                  <input
                    type="text"
                    value={city}
                    onChange={e => { setCity(e.target.value); setGeoState('idle'); }}
                    placeholder="e.g. Surat, Ahmedabad"
                    style={{ ...inputStyle, paddingLeft: '42px' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={geoState === 'loading'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '14px 18px', borderRadius: '12px', fontFamily: 'inherit',
                    fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap',
                    cursor: geoState === 'loading' ? 'not-allowed' : 'pointer',
                    border: geoState === 'success' ? '1.5px solid var(--primary)' : '1.5px solid var(--glass-border)',
                    background: geoState === 'success' ? 'rgba(22,163,74,0.08)' : 'var(--secondary)',
                    color: geoState === 'success' ? 'var(--primary)' : 'var(--foreground)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {geoState === 'loading'
                    ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Detecting…</>
                    : geoState === 'success'
                    ? <><CheckCircle size={16} /> Detected!</>
                    : <><LocateFixed size={16} /> Detect Location</>
                  }
                </button>
              </div>
              {geoState === 'denied' && (
                <p style={{ marginTop: '8px', fontSize: '12px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={13} /> Location unavailable. Please type your city manually.
                </p>
              )}
            </div>

            {/* Save / Cancel */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '14px 28px', borderRadius: '12px', fontSize: '15px',
                  fontWeight: '600', opacity: saving ? 0.7 : 1,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving
                  ? <><Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} /> Saving…</>
                  : <><Save size={18} /> Save Changes</>
                }
              </button>
              <button
                onClick={handleCancel}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '14px 24px', borderRadius: '12px',
                  border: '1.5px solid var(--glass-border)', background: 'none',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: '15px',
                  fontWeight: '600', color: 'var(--muted)',
                }}
              >
                <X size={18} /> Cancel
              </button>
            </div>

            {/* Feedback message */}
            {saveMsg && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 16px', borderRadius: '12px',
                fontSize: '14px', fontWeight: '500',
                background: saveMsg.type === 'success' ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${saveMsg.type === 'success' ? 'rgba(22,163,74,0.2)' : 'rgba(239,68,68,0.2)'}`,
                color: saveMsg.type === 'success' ? 'var(--primary)' : '#dc2626',
              }}>
                {saveMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {saveMsg.text}
              </div>
            )}
          </div>
        )}

        {/* ── Actions Row ── */}
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '28px', marginTop: isEditing ? '0' : '0', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 24px', borderRadius: '12px',
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.05)', color: '#dc2626',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600',
            }}
          >
            <LogOut size={18} /> Sign Out
          </button>
          {user.role === 'ADMIN' && (
            <Link href="/admin" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px' }}>
              Admin Dashboard
            </Link>
          )}
          {user.role === 'VENDOR' && (
            <Link href="/vendor" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px' }}>
              Vendor Dashboard
            </Link>
          )}
        </div>
      </div>

      {/* ── Level, Stats & Achievements ── */}
      <PlayerStats {...playerStats} />
      <PlayerAchievements achievements={achievements} />

      {/* ── Bookings Overview ── */}
      <div className="glass-morphism responsive-padding" style={{ padding: '32px', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--primary)" /> Your Bookings
          </h2>
          <Link href="/bookings" style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View all <ChevronRight size={15} />
          </Link>
        </div>

        <div className="responsive-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total', value: bookingsSummary.total },
            { label: 'Upcoming', value: bookingsSummary.upcoming },
            { label: 'Past', value: bookingsSummary.past },
          ].map(s => (
            <div key={s.label} style={{ padding: '16px', background: 'var(--secondary)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', fontWeight: '600' }}>{s.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '800' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {recentBookings.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', background: 'var(--secondary)', borderRadius: '12px', fontSize: '14px' }}>
            No bookings yet. <Link href="/explore" style={{ color: 'var(--primary)', fontWeight: '600' }}>Find a venue →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentBookings.map(b => {
              const sc = STATUS_COLORS[b.status] || STATUS_COLORS.PENDING;
              return (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--secondary)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{b.venue}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{b.area} • {b.date} • {b.time}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{b.amount}</div>
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 10px', borderRadius: '100px', background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Account Settings ── */}
      <div className="glass-morphism responsive-padding" style={{ padding: '32px', borderRadius: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} color="var(--primary)" /> Account Settings
        </h2>

        {user.hasPassword && (
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>Change Password</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '420px' }}>
              <input type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} placeholder="Current password" style={inputStyle} />
              <input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="New password (min 8 characters)" style={inputStyle} />
              <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Confirm new password" style={inputStyle} />
              {pwMsg && (
                <div style={{ fontSize: '13px', fontWeight: '500', color: pwMsg.type === 'success' ? 'var(--primary)' : '#dc2626' }}>{pwMsg.text}</div>
              )}
              <button
                onClick={changePassword}
                disabled={pwSaving || !pwCurrent || !pwNew}
                className="btn-primary"
                style={{ alignSelf: 'flex-start', padding: '12px 24px', borderRadius: '12px', fontWeight: '600', opacity: (pwSaving || !pwCurrent || !pwNew) ? 0.6 : 1, cursor: (pwSaving || !pwCurrent || !pwNew) ? 'not-allowed' : 'pointer' }}
              >
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trash2 size={16} /> Delete Account
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '14px' }}>
            Permanently delete your account and your bookings. This cannot be undone.
            {venueCount > 0 ? ` You own ${venueCount} venue(s) — delete them first.` : ''}
          </p>
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              disabled={venueCount > 0}
              style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#dc2626', cursor: venueCount > 0 ? 'not-allowed' : 'pointer', fontWeight: '600', fontFamily: 'inherit', opacity: venueCount > 0 ? 0.5 : 1 }}
            >
              Delete Account
            </button>
          ) : (
            <div style={{ maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {user.hasPassword && (
                <input type="password" value={deletePw} onChange={e => setDeletePw(e.target.value)} placeholder="Enter your password to confirm" style={inputStyle} />
              )}
              {deleteMsg && <div style={{ fontSize: '13px', color: '#dc2626' }}>{deleteMsg}</div>}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={deleteAccount}
                  disabled={deleting || (user.hasPassword && !deletePw)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#dc2626', color: 'white', fontWeight: '700', fontFamily: 'inherit', cursor: (deleting || (user.hasPassword && !deletePw)) ? 'not-allowed' : 'pointer', opacity: (deleting || (user.hasPassword && !deletePw)) ? 0.6 : 1 }}
                >
                  {deleting ? 'Deleting…' : 'Yes, delete my account'}
                </button>
                <button
                  onClick={() => { setShowDelete(false); setDeletePw(''); setDeleteMsg(''); }}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'none', color: 'var(--muted)', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: var(--primary) !important; }
      `}</style>
    </main>
  );
}
