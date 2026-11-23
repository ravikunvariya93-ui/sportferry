'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, Users, Building2, CalendarCheck, CalendarDays, Gamepad2,
  Wallet, RefreshCcw, Tag, BarChart3, LifeBuoy, Settings, UserCog,
  LogOut, Shield, ChevronRight, Menu, X
} from 'lucide-react';
import { useAdminTheme } from './AdminThemeProvider';
import styles from './admin.module.css';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/admin/vendors', label: 'Vendors (Ground Owners)', Icon: Building2 },
  { href: '/admin/users', label: 'Users (Players)', Icon: Users },
  { href: '/admin/bookings', label: 'Bookings', Icon: CalendarCheck },
  { href: '/admin/games', label: 'Games & Matching', Icon: Gamepad2 },
  { href: '/admin/calendar', label: 'Calendar (All Venues)', Icon: CalendarDays },
  { href: '/admin/payouts', label: 'Payouts & Settlements', Icon: Wallet },
  { href: '/admin/refunds', label: 'Refunds', Icon: RefreshCcw },
  { href: '/admin/promotions', label: 'Promotions & Offers', Icon: Tag },
  { href: '/admin/reports', label: 'Reports & Analytics', Icon: BarChart3 },
  { href: '/admin/support', label: 'Support & Tickets', Icon: LifeBuoy },
  { href: '/admin/settings', label: 'Settings', Icon: Settings },
  { href: '/admin/staff', label: 'Staff & Roles', Icon: UserCog },
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

    {/* Admin info + sign out */}
    <div className={styles.sidebarFooter}>
      <div className={styles.adminInfo}>
        <div className={styles.adminAvatar}>
          {adminName?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        <div className={styles.adminDetails}>
          <div className={styles.adminName}>{adminName || 'Admin'}</div>
          <div className={styles.adminRole}>Super Admin</div>
        </div>
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
