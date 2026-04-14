'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Calendar, User, LayoutDashboard } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { clsx } from 'clsx';
import styles from './MobileNav.module.css';

const MobileNav = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isVendor = session?.user?.role === 'VENDOR';

  const navItems = isVendor ? [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/vendor' },
    { name: 'Home', icon: Home, path: '/' },
    { name: 'Profile', icon: User, path: '/profile' },
  ] : [
    { name: 'Home', icon: Home, path: '/' },
    { name: 'Bookings', icon: Calendar, path: '/bookings' },
    { name: 'Profile', icon: User, path: '/profile' },
  ];

  return (
    <nav className={styles.mobileNav}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path;
        return (
          <Link 
            key={item.name} 
            href={item.path}
            className={clsx(styles.navItem, isActive && styles.active)}
          >
            <Icon size={24} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileNav;
