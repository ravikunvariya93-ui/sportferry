import React from 'react';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import { Suspense } from 'react';
import ExploreClient from '@/components/Explore/ExploreClient';
import HomeRecommended from '@/components/Home/HomeRecommended';

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
    <div className="responsive-gap-sm" style={{ display: 'flex', flexDirection: 'column', gap: '48px', paddingBottom: '80px' }}>

      {/* Recommended for You — shown once city is set */}
      <HomeRecommended allVenues={allVenues} />

      {/* All Venues — full explore experience */}
      <Suspense fallback={<div style={{ color: 'var(--muted)' }}>Loading venues…</div>}>
        <ExploreClient initialVenues={allVenues} />
      </Suspense>

    </div>
  );
}
