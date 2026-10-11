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

  const { venues, bookings, stats } = await loadVendorData(session.user.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <VendorOverview venues={venues} stats={stats} />
      <VendorVenuesList venues={venues} />
      <VendorBookingsTable bookings={bookings} />
    </div>
  );
}
