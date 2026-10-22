import React from 'react';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getISTDayRange, istTodayISO, istHour } from '@/lib/ist';
import { slotCapacityFor, openSeatsFor } from '@/lib/capacity';
import PlayNowClient from './PlayNowClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Play Now | Sportferry',
  description: 'Join games happening in the next 2 hours. Find available spots near you.',
};

function getNextSlots() {
  // Venues sell 1-hour slots, so look at the next two full IST hours.
  const startHour = istHour() + 1;
  const fmt = (n) => `${String(((n % 24) + 24) % 24).padStart(2, '0')}:00`;

  const slots = [];
  for (let i = 0; i < 2; i++) {
    slots.push({ startTime: fmt(startHour + i), endTime: fmt(startHour + i + 1) });
  }
  return slots;
}

function formatTime(time24) {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export default async function PlayNowPage() {
  const session = await auth();
  if (!session) {
    redirect('/login?callbackUrl=/play-now');
  }

  await dbConnect();

  const dateStr = istTodayISO();
  const nextSlots = getNextSlots();
  const { startUTC, endUTC } = getISTDayRange(dateStr);

  // Find bookings in the upcoming slots with available spots
  const upcomingBookings = await Booking.find({
    date: { $gte: startUTC, $lte: endUTC },
    status: { $in: ['PENDING', 'CONFIRMED'] },
    startTime: { $in: nextSlots.map(s => s.startTime) },
    bookingType: 'ONLINE',
  }).populate('venue').lean();

  const allVenues = await Venue.find({}).lean();

  // Group by venue+slot and count players
  const gamesMap = new Map();
  
  for (const booking of upcomingBookings) {
    if (!booking.venue) continue;
    
    const key = `${booking.venue._id}-${booking.startTime}`;
    
    if (!gamesMap.has(key)) {
      gamesMap.set(key, {
        venueId: booking.venue._id.toString(),
        venueName: booking.venue.name,
        venueArea: booking.venue.area,
        venueCity: booking.venue.city,
        venueImage: booking.venue.images?.[0],
        pricePerHour: booking.venue.pricePerHour,
        discountPercent: booking.venue.discountPercent || 0,
        rating: booking.venue.rating || 0,
        startTime: booking.startTime,
        endTime: booking.endTime,
        playersCount: 0,
        maxPlayers: slotCapacityFor(booking.venue.numberOfTurfs),
        turfCount: Math.max(1, Number(booking.venue.numberOfTurfs) || 1),
        sport: booking.sport,
        bookings: [],
        slotBookings: [],
      });
    }
    
    const game = gamesMap.get(key);
    game.playersCount += booking.playersCount || 1;
    game.bookings.push({
      id: booking._id.toString(),
      classification: booking.classification,
      playersCount: booking.playersCount || 1,
    });
    game.slotBookings.push({
      turf: booking.turf,
      teamSide: booking.teamSide,
      playersCount: booking.playersCount || 1,
      classification: booking.classification,
    });
  }

  // Every venue should offer a joinable game in the next 2 hours, even with no
  // bookings yet — so start one at the earliest upcoming slot (0 players).
  const nextSlot = nextSlots[0];
  for (const v of allVenues) {
    const vid = v._id.toString();
    if ([...gamesMap.keys()].some(k => k.startsWith(`${vid}-`))) continue;
    gamesMap.set(`${vid}-${nextSlot.startTime}`, {
      venueId: vid,
      venueName: v.name,
      venueArea: v.area,
      venueCity: v.city,
      venueImage: v.images?.[0],
      pricePerHour: v.pricePerHour,
      discountPercent: v.discountPercent || 0,
      rating: v.rating || 0,
      startTime: nextSlot.startTime,
      endTime: nextSlot.endTime,
      playersCount: 0,
      maxPlayers: slotCapacityFor(v.numberOfTurfs),
      turfCount: Math.max(1, Number(v.numberOfTurfs) || 1),
      sport: v.sportTypes?.[0] || 'Box Cricket',
      bookings: [],
      slotBookings: [],
    });
  }

  // Filter to games with available spots — only the seats an individual could
  // actually take (a team owns its side, the opposite side is reserved).
  const availableGames = Array.from(gamesMap.values())
    .map(g => ({
      ...g,
      spotsLeft: openSeatsFor({
        bookings: g.slotBookings,
        turfCount: g.turfCount,
      }),
      timeDisplay: `${formatTime(g.startTime)} – ${formatTime(g.endTime)}`,
    }))
    .filter(g => g.spotsLeft > 0)
    .sort((a, b) => a.spotsLeft - b.spotsLeft); // Most urgent first

  return <PlayNowClient games={availableGames} date={dateStr} />;
}
