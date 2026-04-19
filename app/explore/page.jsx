import React from 'react';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import ExploreClient from '@/components/Explore/ExploreClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Explore Venues | Sportferry',
  description: 'Find and book the best sports venues, turfs, and courts near you.',
};

export default async function ExplorePage() {
  await dbConnect();

  const rawVenues = await Venue.find({}).lean();
  const allVenues = rawVenues.map(v => ({
    ...v,
    _id: v._id.toString(),
    owner: v.owner.toString(),
    id: v._id.toString(),
  }));

  return (
    <main style={{ padding: '40px 0' }}>
      <ExploreClient initialVenues={allVenues} />
    </main>
  );
}
