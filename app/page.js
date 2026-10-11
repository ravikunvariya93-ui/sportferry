import React from 'react';
import Link from 'next/link';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import Booking from '@/models/Booking';
import HomeHero from '@/components/Home/HomeHero';
import QuickActions from '@/components/Home/QuickActions';
import TonightsGames from '@/components/Home/TonightsGames';
import FeaturedVenues from '@/components/Home/FeaturedVenues';
import { getISTDayRange, istTodayISO, SLOT_LABELS, isSlotLabelPast, parseSlot } from '@/lib/ist';
import { slotCapacityFor } from '@/lib/capacity';

export const dynamic = 'force-dynamic';

export default async function Home() {
  await dbConnect();

  const rawAll = await Venue.find({}).lean();
  const allVenues = rawAll
    .map(v => ({
      ...v,
      _id: v._id.toString(),
      owner: v.owner.toString(),
      id: v._id.toString(),
    }))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const todayDateString = istTodayISO();
  const { startUTC: todayStart, endUTC: todayEnd } = getISTDayRange(todayDateString);

  // Only TODAY's games: grouping a slot label across two dates would double-count
  // "joined" and under-report the venue's remaining spots.
  const todayBookings = await Booking.find({
    date: { $gte: todayStart, $lte: todayEnd },
    status: { $ne: 'CANCELLED' },
  }).lean();

  const venueSlotMap = {};
  for (const b of todayBookings) {
    const vid = b.venue.toString();
    const key = `${vid}::${b.startTime}::${b.endTime}`;
    if (!venueSlotMap[key]) {
      venueSlotMap[key] = {
        venueId: vid,
        startTime: b.startTime,
        endTime: b.endTime,
        team1Players: 0,
        team2Players: 0,
      };
    }
    if (b.teamSide === 1) venueSlotMap[key].team1Players += b.playersCount || 0;
    else venueSlotMap[key].team2Players += b.playersCount || 0;
  }

  const turfsByVenue = {};
  for (const v of allVenues) turfsByVenue[v.id] = Math.max(1, Number(v.numberOfTurfs) || 1);

  const venueGames = {};
  for (const slot of Object.values(venueSlotMap)) {
    if (!venueGames[slot.venueId]) venueGames[slot.venueId] = [];
    const totalJoined = slot.team1Players + slot.team2Players;
    const maxPlayers = slotCapacityFor(turfsByVenue[slot.venueId]);
    venueGames[slot.venueId].push({
      startTime: slot.startTime,
      endTime: slot.endTime,
      joined: totalJoined,
      maxPlayers,
      spotsLeft: Math.max(0, maxPlayers - totalJoined),
    });
  }

  // Every venue should show a joinable game, even with no bookings yet — so start
  // one at the next upcoming slot (0 joined).
  const nextSlot = parseSlot(SLOT_LABELS.find(l => !isSlotLabelPast(l, todayDateString)) || SLOT_LABELS[0]);
  for (const v of allVenues) {
    if (venueGames[v.id]?.length) continue;
    const maxPlayers = slotCapacityFor(turfsByVenue[v.id]);
    venueGames[v.id] = [{
      startTime: nextSlot.startTime,
      endTime: nextSlot.endTime,
      joined: 0,
      maxPlayers,
      spotsLeft: maxPlayers,
    }];
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', paddingBottom: '40px' }}>
      <HomeHero />
      <QuickActions />
      <TonightsGames venues={allVenues} venueGames={venueGames} date={todayDateString} />
      <FeaturedVenues venues={allVenues} />
    </div>
  );
}
