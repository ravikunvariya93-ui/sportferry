import React from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TournamentsClient from './TournamentsClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Tournaments | Sportferry',
  description: 'Discover upcoming box cricket tournaments and leagues near you.',
};

export default async function TournamentsPage() {
  const session = await auth();
  if (!session) {
    redirect('/login?callbackUrl=/tournaments');
  }

  // For now, we'll show sample tournaments
  // In production, this would fetch real tournaments from DB
  const tournaments = [];

  return <TournamentsClient tournaments={tournaments} />;
}
