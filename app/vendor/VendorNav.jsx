'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/vendor', label: 'Dashboard' },
  { href: '/vendor/scan', label: 'Scan Ticket' },
  { href: '/vendor/venues', label: 'Venues' },
  { href: '/vendor/bookings', label: 'Bookings' },
  { href: '/vendor/customers', label: 'Customers' },
  { href: '/vendor/earnings', label: 'Earnings' },
];

export default function VendorNav() {
  const pathname = usePathname();

  return (
    <nav style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--glass-border)', paddingBottom: '14px' }}>
      {TABS.map(t => {
        const active = t.href === '/vendor' ? pathname === '/vendor' : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: '8px 18px', borderRadius: '100px', fontSize: '14px', fontWeight: '600',
              textDecoration: 'none', transition: 'all 0.2s ease',
              background: active ? 'var(--primary)' : 'var(--secondary)',
              color: active ? 'white' : 'var(--foreground)',
              border: `1px solid ${active ? 'var(--primary)' : 'var(--glass-border)'}`,
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
