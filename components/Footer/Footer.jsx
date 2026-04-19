import React from 'react';
import Link from 'next/link';
import { Instagram, Twitter, Facebook, Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ background: 'var(--secondary)', borderTop: '1px solid var(--glass-border)', padding: '60px 0 30px 0', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px' }}>
        
        {/* Brand */}
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-1.5px', color: 'var(--primary)', marginBottom: '16px' }}>SPORTFERRY</h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
            Simplifying sports venue bookings. Discover, book, and play at the best turfs and courts in your city.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a href="#" style={{ color: 'var(--muted)' }}><Instagram size={20} /></a>
            <a href="#" style={{ color: 'var(--muted)' }}><Twitter size={20} /></a>
            <a href="#" style={{ color: 'var(--muted)' }}><Facebook size={20} /></a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Quick Links</h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <li><Link href="/explore" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Find Venues</Link></li>
            <li><Link href="/register" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Register as Vendor</Link></li>
            <li><Link href="/bookings" style={{ color: 'var(--muted)', textDecoration: 'none' }}>My Bookings</Link></li>
            <li><Link href="/profile" style={{ color: 'var(--muted)', textDecoration: 'none' }}>My Profile</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Support</h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <li><Link href="#" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Privacy Policy</Link></li>
            <li><Link href="#" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Terms of Service</Link></li>
            <li><Link href="#" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Cancellation Policy</Link></li>
            <li><Link href="#" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Help Center</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Contact Us</h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)' }}><Mail size={16} /> support@sportferry.com</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)' }}><Phone size={16} /> +91 98765 43210</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)' }}><MapPin size={16} /> Mumbai, Maharashtra, India</li>
          </ul>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '40px auto 0 auto', padding: '20px', borderTop: '1px solid var(--glass-border)', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
        &copy; {new Date().getFullYear()} Sportferry Technologies Pvt Ltd. All rights reserved.
      </div>
    </footer>
  );
}
