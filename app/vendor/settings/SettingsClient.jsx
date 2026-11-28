'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/clientApi';
import Link from 'next/link';
import { Settings, Bell, ShieldCheck, LifeBuoy, CheckCircle2 } from 'lucide-react';

const TABS = ['General', 'Notifications', 'Platform Rules', 'Support'];
const fieldStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--secondary)', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px' };

export default function SettingsClient() {
  const [tab, setTab] = useState('General');
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const [ticket, setTicket] = useState({ subject: '', body: '', priority: 'Medium' });
  const [ticketMessage, setTicketMessage] = useState('');

  useEffect(() => {
    apiFetch('/api/vendor/settings').then(r => r.json()).then(d => setSettings(d.settings)).catch(() => {});
  }, []);

  const patch = async (body) => {
    setSaved(false);
    const res = await apiFetch('/api/vendor/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) setSaved(true);
  };

  const submitTicket = async (e) => {
    e.preventDefault(); setTicketMessage('');
    const res = await apiFetch('/api/vendor/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ticket) });
    const d = await res.json();
    setTicketMessage(res.ok ? 'Ticket submitted — support will be in touch.' : (d.message || 'Could not submit.'));
    if (res.ok) setTicket({ subject: '', body: '', priority: 'Medium' });
  };

  if (!settings) return <div style={{ color: 'var(--muted)', padding: '24px' }}>Loading settings…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.5px' }}>Settings</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Venue preferences, notifications and support.</p>
      </header>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '9px 18px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: tab === t ? 'var(--primary)' : 'var(--secondary)', color: tab === t ? 'white' : 'var(--foreground)', border: `1px solid ${tab === t ? 'var(--primary)' : 'var(--glass-border)'}` }}>{t}</button>
        ))}
      </div>

      <section className="glass-morphism" style={{ padding: '22px', maxWidth: '720px' }}>
        {tab === 'General' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', gap: '8px', alignItems: 'center' }}><Settings size={17} /> General</h2>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>Venue name<input style={fieldStyle} value={settings.general.venueName} onChange={e => setSettings(p => ({ ...p, general: { ...p.general, venueName: e.target.value } }))} /></label>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>Timezone
              <select style={fieldStyle} value={settings.general.timezone} onChange={e => { const v = e.target.value; setSettings(p => ({ ...p, general: { ...p.general, timezone: v } })); patch({ general: { timezone: v } }); }}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option><option value="UTC">UTC</option>
              </select>
            </label>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>Currency<input style={fieldStyle} value={settings.general.currency} onChange={e => setSettings(p => ({ ...p, general: { ...p.general, currency: e.target.value } }))} /></label>
            <button onClick={() => patch({ general: settings.general })} className="btn-primary" style={{ padding: '12px 20px', borderRadius: '10px', fontWeight: 700 }}>Save changes</button>
          </div>
        )}

        {tab === 'Notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', gap: '8px', alignItems: 'center' }}><Bell size={17} /> Notifications</h2>
            {[
              ['sms', 'SMS alerts'], ['email', 'Email alerts'], ['slotFill', 'Slot-fill updates'], ['reminders', 'Game reminders'],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '10px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                {label}
                <input type="checkbox" checked={settings.notifications[key]} onChange={e => {
                  const value = e.target.checked;
                  setSettings(p => ({ ...p, notifications: { ...p.notifications, [key]: value } }));
                  patch({ notifications: { [key]: value } });
                }} />
              </label>
            ))}
          </div>
        )}

        {tab === 'Platform Rules' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', gap: '8px', alignItems: 'center' }}><ShieldCheck size={17} /> Booking Rules</h2>
            {[
              ['Team Booking (3–6 players)', 'If a team of 3–6 players books on one side, the opposite side needs a team of the same size.'],
              ['Solo Booking', 'When 8 players book, the game confirms regardless of sides.'],
              ['Group Booking', 'Book the entire turf for your group — no other players can join.'],
              ['No double booking', 'One shared calendar for online and offline bookings.'],
              ['Commission', '12% on confirmed online bookings; 0% on your own offline bookings.'],
            ].map(([title, text]) => (
              <div key={title} style={{ padding: '14px', borderRadius: '10px', background: 'var(--secondary)', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{title}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' }}>{text}</div>
              </div>
            ))}
            <Link href="/cancellation-policy" style={{ color: 'var(--primary)', fontSize: '13px' }}>Cancellation policy →</Link>
          </div>
        )}

        {tab === 'Support' && (
          <form onSubmit={submitTicket} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', gap: '8px', alignItems: 'center' }}><LifeBuoy size={17} /> Contact support</h2>
            <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>support@sportferry.com · +91 98765 43210 · Mumbai, Maharashtra</div>
            <input style={fieldStyle} placeholder="Subject *" value={ticket.subject} onChange={e => setTicket(p => ({ ...p, subject: e.target.value }))} />
            <textarea style={{ ...fieldStyle, minHeight: '100px' }} placeholder="Tell us what happened *" value={ticket.body} onChange={e => setTicket(p => ({ ...p, body: e.target.value }))} />
            <select style={fieldStyle} value={ticket.priority} onChange={e => setTicket(p => ({ ...p, priority: e.target.value }))}>
              {['Low', 'Medium', 'High'].map(p => <option key={p}>{p}</option>)}
            </select>
            <button type="submit" className="btn-primary" style={{ padding: '12px 20px', borderRadius: '10px', fontWeight: 700 }}>Submit ticket</button>
            {ticketMessage && <div style={{ fontSize: '13px', color: 'var(--primary)', display: 'flex', gap: '6px', alignItems: 'center' }}><CheckCircle2 size={14} /> {ticketMessage}</div>}
          </form>
        )}

        {saved && <div style={{ fontSize: '12px', color: 'var(--primary)' }}>Saved.</div>}
      </section>
    </div>
  );
}
