'use client';

import React from 'react';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import styles from './MobileHeader.module.css';

const MobileHeader = () => {
  return (
    <header className={styles.mobileHeader}>
      <Link href="/" className={styles.logo}>
        <Trophy size={24} />
        <span>Sportferry</span>
      </Link>
    </header>
  );
};

export default MobileHeader;
