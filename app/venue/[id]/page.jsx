import React from 'react';
import { loadPricedVenue } from '@/lib/venueOffers';
import VenueDetailClient from './VenueDetailClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function VenueDetailPage({ params }) {
  try {
    const venue = await loadPricedVenue(params.id);
    if (!venue) return notFound();
    return <VenueDetailClient venue={venue} />;
  } catch (error) {
    // If id is not a valid ObjectId, catch and return 404
    return notFound();
  }
}
