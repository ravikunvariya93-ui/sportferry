'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/clientApi';
import { Settings, ShieldCheck, Bell, CheckCircle2 } from 'lucide-react';
import styles from '../admin.module.css';

export default function SettingsClient() {
  const [settings, setSettings] = useState(null);
  const [commission, setCommission] = useState(12);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch('/api/admin/settings').then(r => r.json()).then(d => { setSettings(d.settings); setCommission(d.commissionPercent); }).catch(() => {});
  }, []);

  const patch = async (group, key, value) => {
    setSaved(false);
    setSettings(p => ({ ...p, [group]: { ...p[group], [key]: value } }));
    const res = await apiFetch('/api/admin/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [group]: { [key]: value } }),
    });
    if (res.ok) setSaved(true);
  };

  if (!settings) return <div className={styles.loadingWrap}>Loading settings…</div>;

  const toggle = (group, key, label, desc) => (
    <label key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '14px', border: '1px solid var(--admin-border)', borderRadius: '12px', cursor: 'pointer' }}>
      <span><strong style={{ fontSize: '13.5px' }}>{label}</strong><span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{desc}</span></span>
      <input type="checkbox" checked={Boolean(settings[group][key])} onChange={e => patch(group, key, e.target.checked)} />
    </label>
  );

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Settings size={28} color="#22c55e" />
          <div>
            <h1 className={styles.pageTitle}>Settings</h1>
            <p className={styles.pageSubtitle}>Platform-wide rules and preferences.</p>
          </div>
        </div>
      </div>

      {saved && <div style={{ color: '#22c55e', fontSize: '13px', marginBottom: '14px', display: 'flex', gap: '6px', alignItems: 'center' }}><CheckCircle2 size={15} /> Saved</div>}

      <div className={styles.overviewGrid}>
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><ShieldCheck size={17} /> Booking rules</h2>
          <div style={{ display: 'grid', gap: '10px' }}>
            {toggle('rules', 'teamMatch', 'Team match', 'An opposing team must match the same player count.')}
            {toggle('rules', 'autoConfirm', 'Auto-confirm', 'A turf confirms at 8 players in total.')}
            {toggle('rules', 'groupNeedsEmpty', 'Group needs empty turf', 'A group books a whole free turf.')}
            {toggle('rules', 'noDoubleBooking', 'No double booking', 'One shared calendar for online and offline slots.')}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><Bell size={17} /> Automation</h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              {toggle('automation', 'payouts', 'Payout automation', 'Record settlements automatically when reviewed.')}
              {toggle('automation', 'refunds', 'Refund automation', 'Queue refunds for cancelled bookings.')}
              {toggle('automation', 'notifications', 'Notifications', 'Send slot-fill and booking alerts.')}
            </div>
          </div>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>General</h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              {['supportEmail', 'supportPhone', 'address'].map(key => (
                <label key={key} style={{ fontSize: '12px', fontWeight: 600 }}>
                  {key.replace(/([A-Z])/g, ' $1')}
                  <input className={styles.searchInput} style={{ width: '100%', marginTop: '5px' }} value={settings.general[key]}
                    onChange={e => setSettings(p => ({ ...p, general: { ...p.general, [key]: e.target.value } }))}
                    onBlur={e => patch('general', key, e.target.value)} />
                </label>
              ))}
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Platform commission: <strong style={{ color: '#22c55e' }}>{commission}%</strong> (fixed in code).</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
