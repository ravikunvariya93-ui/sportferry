'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  Calendar, 
  User, 
  Settings, 
  LogOut, 
  Trophy,
  LayoutDashboard,
  LogIn,
  UserPlus
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { clsx } from 'clsx';
import { useSession, signOut } from 'next-auth/react';

const Sidebar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Admin section has its own isolated layout — hide the main sidebar
  if (pathname?.startsWith('/admin')) return null;

  let navItems = [];

  if (session?.user?.role === 'VENDOR') {
    navItems = [
      { name: 'Vendor Dashboard', icon: LayoutDashboard, path: '/vendor' },
      { name: 'Platform Home', icon: Home, path: '/' },
      { name: 'Profile', icon: User, path: '/profile' },
    ];
  } else {
    // Player or Unauthenticated view
    navItems = [
      { name: 'Home', icon: Home, path: '/' },
    ];

    if (session?.user) {
      navItems.push(
        { name: 'My Bookings', icon: Calendar, path: '/bookings' },
        { name: 'Profile', icon: User, path: '/profile' }
      );
    }
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <Trophy size={28} />
        <span>Sportferry</span>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.name} 
              href={item.path}
              className={clsx(styles.navItem, isActive && styles.activeNavItem)}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}

      </nav>

      <div className={styles.footer}>
        {session?.user ? (
          <div className={styles.navItem} onClick={() => signOut({ callbackUrl: '/' })} style={{ cursor: 'pointer' }}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link href="/login" className={styles.navItem}>
              <LogIn size={20} />
              <span>Sign In</span>
            </Link>
            <Link href="/register" className={styles.navItem}>
              <UserPlus size={20} />
              <span>Create Account</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
