import React from 'react';
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getPlayerProfileData } from '@/lib/profileData';
import ProfileHeader from '@/components/Profile/ProfileHeader';
import PlayerStats from '@/components/Profile/PlayerStats';
import PlayerAchievements from '@/components/Profile/PlayerAchievements';

export const dynamic = 'force-dynamic';

export default async function AdminUserProfilePage({ params }) {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') redirect('/login');

  const data = await getPlayerProfileData(params.id);
  if (!data) notFound();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Link
        href="/admin/users"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px', width: 'fit-content',
          color: 'var(--admin-text-sub)', textDecoration: 'none', fontSize: '14px', fontWeight: '600',
        }}
      >
        <ArrowLeft size={16} /> Back to Users
      </Link>

      <ProfileHeader
        name={data.user.name}
        city={data.user.city}
        joinedISO={data.user.createdAt}
        level={data.level}
      />
      <PlayerStats {...data.stats} />
      <PlayerAchievements achievements={data.achievements} />
    </div>
  );
}
