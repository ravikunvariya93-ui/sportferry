import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { loadVendorData } from '@/lib/vendorData';
import AnalyticsClient from './AnalyticsClient';

export const dynamic = 'force-dynamic';

export default async function VendorAnalyticsPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') redirect('/login');
  const { bookings, kpis, earnings, trend } = await loadVendorData(session.user.id);
  return <AnalyticsClient bookings={bookings} kpis={kpis} earnings={earnings} trend={trend} />;
}
