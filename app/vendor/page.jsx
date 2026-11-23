import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { loadVendorData } from '@/lib/vendorData';
import VendorOverview from './VendorOverview';
import VendorVenuesList from './VendorVenuesList';
import VendorBookingsTable from './VendorBookingsTable';

export const dynamic = 'force-dynamic';

export default async function VendorDashboard() {
  const session = await auth();
  if (!session || session.user.role !== 'VENDOR') {
    redirect('/login');
  }

  const { venues, bookings, kpis, earnings, sourceSplit, trend, onboarding } = await loadVendorData(session.user.id);

  if (onboarding.needsOnboarding) {
    redirect('/vendor/onboarding');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <VendorOverview venues={venues} kpis={kpis} earnings={earnings} sourceSplit={sourceSplit} trend={trend} />
      <VendorVenuesList venues={venues} />
      <VendorBookingsTable bookings={bookings} />
    </div>
  );
}
