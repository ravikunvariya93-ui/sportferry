'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { isActivePath } from '@/lib/navConfig';
import {
  LayoutDashboard, CalendarDays, CalendarCheck, Wallet,
  Building2, IndianRupee, Users, BarChart3, UserCog, Gamepad2, Settings,
  Trophy, LogOut,
} from 'lucide-react';

const SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: '/vendor', label: 'Dashboard', Icon: LayoutDashboard },
      { href: '/vendor/calendar', label: 'Calendar & Slots', Icon: CalendarDays },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/vendor/bookings', label: 'Bookings', Icon: CalendarCheck },
      { href: '/vendor/calendar?offline=1', label: 'Offline Booking', Icon: CalendarDays, neverActive: true },
      { href: '/vendor/games', label: 'Game Status', Icon: Gamepad2 },
      { href: '/vendor/payouts', label: 'Payouts & Settlements', Icon: Wallet },
    ],
  },
  {
    label: 'Venue Setup',
    items: [
      { href: '/vendor/grounds', label: 'Grounds & Courts', Icon: Building2 },
      { href: '/vendor/pricing', label: 'Pricing & Rules', Icon: IndianRupee },
      { href: '/vendor/analytics', label: 'Analytics', Icon: BarChart3 },
      { href: '/vendor/customers', label: 'Customers', Icon: Users },
    ],
  },
  {
    label: 'Access & Settings',
    items: [
      { href: '/vendor/staff', label: 'Staff & Access', Icon: UserCog },
      { href: '/vendor/settings', label: 'Settings', Icon: Settings },
    ],
  },
];

const MOBILE_ITEMS = [
  { href: '/vendor', label: 'Dashboard' },
  { href: '/vendor/calendar', label: 'Calendar' },
  { href: '/vendor/bookings', label: 'Bookings' },
  { href: '/vendor/games', label: 'Games' },
  { href: '/vendor/grounds', label: 'Grounds' },
  { href: '/vendor/pricing', label: 'Pricing' },
  { href: '/vendor/payouts', label: 'Payouts' },
  { href: '/vendor/analytics', label: 'Analytics' },
  { href: '/vendor/customers', label: 'Customers' },
  { href: '/vendor/staff', label: 'Staff' },
  { href: '/vendor/settings', label: 'Settings' },
];

export default function VendorSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const name = session?.user?.name || 'Owner';
  const initial = name.charAt(0).toUpperCase();
  const handleSignOut = () => signOut({ callbackUrl: '/' });

  return (
    <>
      <aside className="vendor-rail">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 10px', marginBottom: '26px' }}>
          <Image src="/logo-mark.png" alt="" width={34} height={34} style={{ objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>Sportferry</div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ground Owner</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {SECTIONS.map(section => (
            <div key={section.label}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', padding: '0 10px', marginBottom: '8px' }}>
                {section.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {section.items.map((item) => {
                  const { href, label, Icon, disabled, neverActive } = item;
                  if (disabled) {
                    return (
                      <span key={label} title="Coming soon" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '10px', fontSize: '13.5px', color: 'var(--muted)', opacity: 0.55, cursor: 'not-allowed' }}>
                        <Icon size={16} /> {label}
                      </span>
                    );
                  }
                  const active = isActivePath(pathname, href, { neverActive });
                  return (
                    <Link key={label} href={href} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '10px',
                      fontSize: '13.5px', fontWeight: active ? 700 : 500, textDecoration: 'none',
                      color: active ? 'var(--primary)' : 'var(--foreground)',
                      background: active ? 'rgba(22,163,74,0.1)' : 'transparent',
                    }}>
                      <Icon size={16} /> {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
              {initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>VENDOR</div>
            </div>
          </div>
          <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', marginTop: '10px', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      <nav className="vendor-mobile-nav">
        {MOBILE_ITEMS.map(({ href, label }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link key={label} href={href} style={{
              padding: '8px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none',
              background: active ? 'var(--primary)' : 'var(--secondary)', color: active ? 'white' : 'var(--foreground)',
              border: `1px solid ${active ? 'var(--primary)' : 'var(--glass-border)'}`, flexShrink: 0,
            }}>{label}</Link>
          );
        })}
        <button onClick={handleSignOut} style={{ padding: '8px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', background: 'rgba(239,68,68,0.06)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Sign Out</button>
      </nav>
    </>
  );
}
