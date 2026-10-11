import React from 'react';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PlayersClient from './PlayersClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Find Players | Sportferry',
  description: 'Find players near you to form teams and join games together.',
};

export default async function FindPlayersPage() {
  const session = await auth();
  if (!session) {
    redirect('/login?callbackUrl=/players');
  }

  await dbConnect();

  // Get all players (non-vendor, non-admin users) who have a city set
  const players = await User.find({
    role: 'PLAYER',
    city: { $exists: true, $ne: '' },
  })
    .select('name city createdAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const serializedPlayers = players.map(p => ({
    id: p._id.toString(),
    name: p.name,
    city: p.city,
    joined: p.createdAt.toISOString(),
  }));

  return <PlayersClient players={serializedPlayers} currentUserId={session.user.id} />;
}
