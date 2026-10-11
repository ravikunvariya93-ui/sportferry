import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { loadVendorData } from '@/lib/vendorData';
import VendorVenuesList from '../VendorVenuesList';

export const dynamic = 'force-dynamic';

export default async function VendorVenuesPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') redirect('/login');

  const { venues } = await loadVendorData(session.user.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '6px', letterSpacing: '-0.5px' }}>Your Venues</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Register and manage the venues you list on Sportferry.</p>
      </header>
      <VendorVenuesList venues={venues} />
    </div>
  );
}
