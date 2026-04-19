import React from 'react';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import { Suspense } from 'react';
import HomeHero from '@/components/Home/HomeHero';
import HomeCitySelector from '@/components/Home/HomeCitySelector';
import HomeRecommended from '@/components/Home/HomeRecommended';
import ExploreClient from '@/components/Explore/ExploreClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  await dbConnect();

  const rawAll = await Venue.find({}).lean();
  const allVenues = rawAll.map(v => ({
    ...v,
    _id: v._id.toString(),
    owner: v.owner.toString(),
    id: v._id.toString(),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', paddingBottom: '80px' }}>

      {/* Hero — hidden once user selects a city */}
      <HomeHero />

      {/* Popular Cities */}
      <HomeCitySelector />

      {/* Recommended for You — shown once city is set */}
      <HomeRecommended allVenues={allVenues} />

      {/* All Venues — full explore experience */}
      <Suspense fallback={<div style={{ color: 'var(--muted)' }}>Loading venues…</div>}>
        <ExploreClient initialVenues={allVenues} />
      </Suspense>

    </div>
  );
}
