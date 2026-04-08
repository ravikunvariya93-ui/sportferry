import React from 'react';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import ExploreClient from './ExploreClient';

export default async function ExplorePage() {
  await dbConnect();
  
  // Fetch pristine data natively from DB, bypassing all mocks
  const rawVenues = await Venue.find({}).lean();
  
  // Serialize native Mongoose ObjectIds into simple strings for Client Components
  const venues = rawVenues.map(v => ({
    ...v,
    _id: v._id.toString(),
    owner: v.owner.toString(),
    id: v._id.toString(), // Preserve legacy UI binding
  }));

  return <ExploreClient initialVenues={venues} />;
}
