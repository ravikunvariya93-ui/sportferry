'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trophy, User } from 'lucide-react';
import styles from './MobileHeader.module.css';
import LocationPill from './LocationPill';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

const MobileHeader = () => {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Admin and vendor portals have their own isolated layouts
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/vendor')) return null;

  return (
    <header className={styles.mobileHeader}>
      <Link href="/" className={styles.logo} aria-label="Sportferry home">
        <Image src="/logo-mark.png" alt="" width={30} height={30} className={styles.logoMark} />
        <span className={styles.logoText}>Sportferry</span>
      </Link>

      <div className={styles.actions}>
        <LocationPill />
        {session ? (
          <Link href="/profile" className={styles.avatar} aria-label="Profile">
            {session.user?.name?.charAt(0) || <User size={18} />}
          </Link>
        ) : (
          <Link href="/login" className={styles.loginBtn}>Log In</Link>
        )}
      </div>
    </header>
  );
};

export default MobileHeader;
