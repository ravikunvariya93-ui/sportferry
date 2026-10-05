import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import HomeHero from '@/components/Home/HomeHero';
import QuickActions from '@/components/Home/QuickActions';
import TonightsGames from '@/components/Home/TonightsGames';
import VenueCard from '@/components/VenueCard/VenueCard';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', paddingBottom: '40px' }}>
      <HomeHero />
      <QuickActions />
      <TonightsGames venues={allVenues} />

      <section style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>All Venues</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>Browse and book box cricket turfs across Gujarat</p>
          </div>
          <Link href="/explore" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            See All <ArrowRight size={14} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {allVenues.map(venue => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      </section>
    </div>
  );
}
