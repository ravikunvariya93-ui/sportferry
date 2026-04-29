import React from 'react';

export const metadata = {
  title: 'My Profile | Sportferry',
  description: 'Manage your Sportferry account, roles, and personal information.',
};
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import UserDoc from '@/models/User';
import ProfileClient from './ProfileClient';

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

  const serializedUser = {
    name: user.name,
    email: user.email || '',
    phone: user.phone || '',
    city: user.city || '',
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };

  return <ProfileClient initialUser={serializedUser} />;
}
