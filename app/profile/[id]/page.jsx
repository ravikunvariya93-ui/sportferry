import React from 'react';
import { notFound } from 'next/navigation';
import { getPlayerProfileData } from '@/lib/profileData';
import ProfileHeader from '@/components/Profile/ProfileHeader';
import PlayerStats from '@/components/Profile/PlayerStats';
import PlayerAchievements from '@/components/Profile/PlayerAchievements';

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage({ params }) {
  const data = await getPlayerProfileData(params.id);
  if (!data) return notFound();

  return (
    <main style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px 80px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <ProfileHeader
        name={data.user.name}
        city={data.user.city}
        joinedISO={data.user.createdAt}
        level={data.level}
      />
      <PlayerStats {...data.stats} />
      <PlayerAchievements achievements={data.achievements} />
    </main>
  );
}
