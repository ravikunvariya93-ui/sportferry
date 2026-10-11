import React from 'react';

export const metadata = {
  title: 'My Profile | Sportferry',
  description: 'Manage your Sportferry account, roles, and personal information.',
};
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import UserDoc from '@/models/User';
import Venue from '@/models/Venue';
import Booking from '@/models/Booking';
import { hoursUntilSlot } from '@/lib/cancellationPolicy';
import { formatToAMPM } from '@/lib/ist';
import { getPlayerLevel, getAchievements } from '@/lib/playerLevel';
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

  const [rawBookings, venueCount] = await Promise.all([
    Booking.find({ user: session.user.id, status: { $ne: 'PAYMENT_PENDING' } })
      .populate('venue', 'name area city')
      .sort({ createdAt: -1 })
      .lean(),
    Venue.countDocuments({ owner: user._id }),
  ]);

  let upcoming = 0;
  let past = 0;
  for (const b of rawBookings) {
    if (b.status === 'CANCELLED') continue;
    if (hoursUntilSlot(b) > 0) upcoming += 1;
    else past += 1;
  }
  const bookingsSummary = {
    total: rawBookings.filter(b => b.status !== 'CANCELLED').length,
    upcoming,
    past,
  };

  const venueSet = new Set();
  for (const b of rawBookings) {
    if (b.status === 'CANCELLED') continue;
    if (b.venue?._id) venueSet.add(b.venue._id.toString());
  }
  const venuesPlayed = venueSet.size;
  const memberMonths = Math.max(
    0,
    Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  );

  const level = getPlayerLevel(past);
  const achievements = getAchievements({ gamesPlayed: past, upcoming, venues: venuesPlayed, memberMonths });
  const playerStats = { gamesPlayed: past, upcoming, venues: venuesPlayed };

  const recentBookings = rawBookings.slice(0, 4).map(b => ({
    id: b._id.toString(),
    venue: b.venue?.name || 'Venue',
    area: b.venue ? `${b.venue.area}, ${b.venue.city}` : '',
    date: new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: `${formatToAMPM(b.startTime)} – ${formatToAMPM(b.endTime)}`,
    status: b.status,
    amount: `₹${b.totalAmount}`,
  }));

  const serializedUser = {
    name: user.name,
    username: user.username || '',
    email: user.email || '',
    phone: user.phone || '',
    city: user.city || '',
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    hasPassword: !!user.password,
  };

  return (
    <ProfileClient
      initialUser={serializedUser}
      bookingsSummary={bookingsSummary}
      recentBookings={recentBookings}
      venueCount={venueCount}
      level={level}
      achievements={achievements}
      playerStats={playerStats}
    />
  );
}
