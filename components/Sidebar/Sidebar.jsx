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
  UserPlus,
  Info
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { clsx } from 'clsx';
import { useSession, signOut } from 'next-auth/react';

const Sidebar = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  // Admin section has its own isolated layout — hide the main sidebar
  if (pathname?.startsWith('/admin')) return null;

  let navItems = [];

  if (session?.user?.role === 'ADMIN') {
    navItems = [
      { name: 'Admin Dashboard', icon: LayoutDashboard, path: '/admin' },
      { name: 'Platform Home', icon: Home, path: '/' },
      { name: 'Find Venues', icon: Search, path: '/explore' },
      { name: 'My Bookings', icon: Calendar, path: '/bookings' },
      { name: 'Instructions', icon: Info, path: '/instructions' },
      { name: 'Profile', icon: User, path: '/profile' },
    ];
  } else if (session?.user?.role === 'VENDOR') {
    navItems = [
      { name: 'Vendor Dashboard', icon: LayoutDashboard, path: '/vendor' },
      { name: 'Platform Home', icon: Home, path: '/' },
      { name: 'Find Venues', icon: Search, path: '/explore' },
      { name: 'My Bookings', icon: Calendar, path: '/bookings' },
      { name: 'Instructions', icon: Info, path: '/instructions' },
      { name: 'Profile', icon: User, path: '/profile' },
    ];
  } else {
    // Player or Unauthenticated view
    navItems = [
      { name: 'Home', icon: Home, path: '/' },
      { name: 'Find Venues', icon: Search, path: '/explore' },
      { name: 'Instructions', icon: Info, path: '/instructions' },
    ];

    if (session?.user) {
      navItems.push(
        { name: 'My Bookings', icon: Calendar, path: '/bookings' },
        { name: 'Profile', icon: User, path: '/profile' }
      );
    }
  }

  const authState = isLoading ? 'loading' : session?.user ? 'authenticated' : 'unauthenticated';

  return (
    <div className={styles.sidebar} data-auth-state={authState}>
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
        {isLoading ? (
          <div className={styles.loadingPlaceholder} />
        ) : session?.user ? (
          <div className={styles.userSection}>
            <div className={styles.userProfile}>
              <div className={styles.avatar}>
                {session.user.name?.charAt(0) || 'U'}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{session.user.name}</span>
                <span className={styles.userRole}>{session.user.role === 'USER' ? 'PLAYER' : session.user.role}</span>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className={styles.logoutButton}
              title="Sign Out"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
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
