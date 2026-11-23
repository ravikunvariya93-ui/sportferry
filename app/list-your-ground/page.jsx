import React from 'react';
import Link from 'next/link';
import { Building2, Layers, Lock, TrendingUp, CalendarCheck, IndianRupee, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'List Your Ground | Sportferry',
  description: 'List your sports venue on Sportferry — manage online & offline bookings, turfs and pricing in one place.',
};

const BENEFITS = [
  { Icon: Layers, title: 'Multiple Turfs & Courts', text: 'List every turf, court or playing area under one venue.' },
  { Icon: CalendarCheck, title: 'Online & Offline Bookings', text: 'Manage everything on one shared calendar.' },
  { Icon: TrendingUp, title: 'Grow Your Revenue', text: 'Fill more slots with solo, team and group games.' },
  { Icon: Lock, title: '₹0 on Offline Bookings', text: 'No commission on the bookings you bring yourself.' },
];

const FEATURES = [
  { Icon: CalendarCheck, title: 'One Shared Calendar', text: 'No double bookings — online and walk-in bookings sync instantly.' },
  { Icon: Building2, title: 'Grounds & Courts', text: 'Add turfs with size, surface, lighting and playing formats.' },
  { Icon: IndianRupee, title: 'Flexible Pricing', text: 'Set weekday, weekend and peak-hour rates per venue.' },
  { Icon: TrendingUp, title: 'Payouts & Reports', text: 'Track confirmed bookings and settle monthly from your dashboard.' },
];

export default function ListYourGroundPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '56px', paddingBottom: '40px' }}>
      <section style={{ borderRadius: '24px', overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg, #064e3b, #16a34a)', color: 'white', padding: '64px 40px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 800, letterSpacing: '-1px', maxWidth: '720px', lineHeight: 1.1 }}>
          List Your Sports Venue on <span style={{ color: '#bbf7d0' }}>Sportferry</span>
        </h1>
        <p style={{ marginTop: '16px', fontSize: '17px', maxWidth: '560px', opacity: 0.95 }}>
          Reach more players, manage online &amp; offline bookings in one place, and get paid monthly.
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap' }}>
          <Link href="/register?role=VENDOR" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'white', color: '#064e3b', padding: '14px 26px', borderRadius: '100px', fontWeight: 700, textDecoration: 'none' }}>
            List Your Ground — Free <ArrowRight size={18} />
          </Link>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', color: 'white', padding: '14px 26px', borderRadius: '100px', fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.3)' }}>
            Sign In
          </Link>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '20px', textAlign: 'center' }}>Why list with Sportferry?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '18px' }}>
          {BENEFITS.map(({ Icon, title, text }) => (
            <div key={title} className="glass-morphism" style={{ padding: '24px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(22,163,74,0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <Icon size={22} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>{title}</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.6 }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '20px', textAlign: 'center' }}>Everything in one dashboard</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '18px' }}>
          {FEATURES.map(({ Icon, title, text }) => (
            <div key={title} className="glass-morphism" style={{ padding: '24px' }}>
              <Icon size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '10px 0 6px' }}>{title}</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.6 }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ textAlign: 'center', padding: '40px', borderRadius: '24px', background: 'var(--secondary)', border: '1px solid var(--glass-border)' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px' }}>Ready to get more bookings?</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '22px' }}>It&apos;s free to join. Add your venue and turfs in a few minutes.</p>
        <Link href="/register?role=VENDOR" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 30px', borderRadius: '100px', fontWeight: 700, textDecoration: 'none' }}>
          List Your Ground <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
