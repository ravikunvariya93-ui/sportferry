import React from 'react';

export const metadata = {
  title: 'My Profile | Sportferry',
  description: 'Manage your Sportferry account, roles, and personal information.',
};
import { auth, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { User, LogOut, Shield, ShieldCheck, Mail, Calendar } from 'lucide-react';
import dbConnect from '@/lib/mongodb';
import UserDoc from '@/models/User';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  await dbConnect();
  const user = await UserDoc.findById(session.user.id).lean();

  if (!user) {
    redirect('/login');
  }

  return (
    <main style={{ maxWidth: '800px', margin: '60px auto', padding: '0 20px' }}>
      <div className="glass-morphism" style={{ padding: '40px', borderRadius: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <User size={40} />
          </div>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '4px' }}>{user.name}</h1>
            <p style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={16} /> {user.email}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div style={{ padding: '20px', background: 'var(--secondary)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
            <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} /> Account Type
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user.role} {user.role === 'ADMIN' && <ShieldCheck size={18} />}
            </div>
          </div>
          <div style={{ padding: '20px', background: 'var(--secondary)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
            <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} /> Joined On
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>
              {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '32px', display: 'flex', gap: '16px' }}>
          <form action={async () => {
             'use server';
             await signOut();
          }}>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: '#dc2626' }}>
              <LogOut size={18} /> Sign Out
            </button>
          </form>
          {user.role === 'ADMIN' && (
            <a href="/admin" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px' }}>
              Admin Dashboard
            </a>
          )}
          {user.role === 'VENDOR' && (
            <a href="/vendor" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px' }}>
              Vendor Dashboard
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
