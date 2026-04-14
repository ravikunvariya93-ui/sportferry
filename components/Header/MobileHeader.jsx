'use client';

import React from 'react';
import Link from 'next/link';
import { Trophy, UserCircle } from 'lucide-react';
import styles from './MobileHeader.module.css';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

const MobileHeader = () => {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Admin section has its own isolated layout
  if (pathname?.startsWith('/admin')) return null;

  return (
    <header className={styles.mobileHeader}>
      <Link href="/" className={styles.logo}>
        <Trophy size={24} />
        <span>Sportferry</span>
      </Link>

      <div className={styles.actions}>
        {session ? (
          <Link href="/profile" className={styles.profileBtn}>
            <UserCircle size={24} />
          </Link>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/login" className={styles.loginBtn}>Sign In</Link>
            <Link href="/register" className={styles.registerBtn}>Register</Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default MobileHeader;
