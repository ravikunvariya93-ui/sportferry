import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { loadVendorData } from '@/lib/vendorData';
import VendorBookingsTable from '../VendorBookingsTable';

export const dynamic = 'force-dynamic';

export default async function VendorBookingsPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') redirect('/login');

  const { bookings } = await loadVendorData(session.user.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '6px', letterSpacing: '-0.5px' }}>Bookings</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Every booking made on your venues.</p>
      </header>
      <VendorBookingsTable bookings={bookings} />
    </div>
  );
}
