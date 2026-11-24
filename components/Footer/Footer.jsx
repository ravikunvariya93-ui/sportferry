import React from 'react';
import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>

        {/* Brand */}
        <div className={styles.brand}>
          <h2 className={styles.brandName}>SPORTFERRY</h2>
          <p className={styles.desc}>
            Simplifying sports venue bookings. Discover, book, and play at the best turfs and courts in your city.
          </p>
        </div>

        {/* Support */}
        <div>
          <h3 className={styles.colTitle}>Support</h3>
          <ul className={styles.list}>
            <li><Link href="/privacy-policy" className={styles.link}>Privacy Policy</Link></li>
            <li><Link href="/terms-of-service" className={styles.link}>Terms of Service</Link></li>
            <li><Link href="/cancellation-policy" className={styles.link}>Cancellation Policy</Link></li>
            <li><Link href="/help-center" className={styles.link}>Help Center</Link></li>
            <li><Link href="/instructions" className={styles.link}>Instructions</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className={styles.colTitle}>Contact Us</h3>
          <ul className={styles.list}>
            <li className={styles.contactItem}><Mail size={16} /> support@sportferry.com</li>
            <li className={styles.contactItem}><Phone size={16} /> +91 98765 43210</li>
            <li className={styles.contactItem}><MapPin size={16} /> Mumbai, Maharashtra, India</li>
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        &copy; {new Date().getFullYear()} Sportferry Technologies Pvt Ltd. All rights reserved.
      </div>
    </footer>
  );
}
