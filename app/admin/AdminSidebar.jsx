'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, Users, Building2, CalendarCheck,
  LogOut, Shield, ChevronRight, Menu, X, Sun, Moon
} from 'lucide-react';
import { useAdminTheme } from './AdminThemeProvider';
import styles from './admin.module.css';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', Icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', Icon: Users },
  { href: '/admin/venues', label: 'Venues', Icon: Building2 },
  { href: '/admin/bookings', label: 'Bookings', Icon: CalendarCheck },
];

const SidebarContent = ({ theme, toggleTheme, pathname, adminName, handleSignOut, setMobileOpen }) => (
  <div className={styles.sidebar}>
    {/* Logo */}
    <div className={styles.sidebarLogo}>
      <div className={styles.logoIcon}>
        <Shield size={20} />
      </div>
      <div>
        <div className={styles.logoTitle}>Sportferry</div>
        <div className={styles.logoBadge}>Admin Panel</div>
      </div>
    </div>

    {/* Navigation */}
    <nav className={styles.nav}>
      <div className={styles.navLabel}>Navigation</div>
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <Icon size={18} />
            <span>{label}</span>
            {isActive && <ChevronRight size={14} className={styles.navChevron} />}
          </Link>
        );
      })}
    </nav>

    {/* Admin info + Theme Toggle + sign out */}
    <div className={styles.sidebarFooter}>
      <div className={styles.adminInfo}>
        <div className={styles.adminAvatar}>
          {adminName?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        <div className={styles.adminDetails}>
          <div className={styles.adminName}>{adminName || 'Admin'}</div>
          <div className={styles.adminRole}>Super Admin</div>
        </div>
        <button 
          className={styles.iconBtn} 
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{ 
            background: 'var(--admin-nav-hover)',
            color: 'var(--admin-text-main)',
            width: '36px',
            height: '36px'
          }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
      <button className={styles.signOutBtn} onClick={handleSignOut}>
        <LogOut size={16} />
        Sign Out
      </button>
    </div>
  </div>
);

export default function AdminSidebar({ adminName }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useAdminTheme();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <>
      {/* Desktop sidebar */}
      <div className={styles.desktopSidebar}>
        <SidebarContent 
          theme={theme} 
          toggleTheme={toggleTheme} 
          pathname={pathname} 
          adminName={adminName} 
          handleSignOut={handleSignOut} 
          setMobileOpen={() => {}}
        />
      </div>

      {/* Mobile top bar */}
      <div className={styles.mobileTopBar}>
        <div className={styles.mobileLogoArea}>
          <Shield size={18} className={styles.mobileShield} />
          <span className={styles.mobileTitle}>Admin Panel</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className={styles.iconBtn} 
            onClick={toggleTheme}
            style={{ background: 'none', border: 'none', color: 'var(--admin-text-sub)' }}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className={styles.mobileOverlay} onClick={() => setMobileOpen(false)}>
          <div className={styles.mobileDrawer} onClick={(e) => e.stopPropagation()}>
            <SidebarContent 
              theme={theme} 
              toggleTheme={toggleTheme} 
              pathname={pathname} 
              adminName={adminName} 
              handleSignOut={handleSignOut} 
              setMobileOpen={setMobileOpen}
            />
          </div>
        </div>
      )}
    </>
  );
}
