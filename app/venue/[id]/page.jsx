import React from 'react';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import VenueDetailClient from './VenueDetailClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function VenueDetailPage({ params }) {
  await dbConnect();

  try {
    const rawVenue = await Venue.findById(params.id).lean();
    
    if (!rawVenue) {
      return notFound();
    }

    const venue = {
      ...rawVenue,
      _id: rawVenue._id.toString(),
      owner: rawVenue.owner.toString(),
      id: rawVenue._id.toString(),
    };

    return <VenueDetailClient venue={venue} />;
  } catch (error) {
    // If id is not a valid ObjectId, catch and return 404
    return notFound();
  }
}
