import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import VenuesClient from './VenuesClient';

export const dynamic = 'force-dynamic';

export default async function AdminVenuesPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') redirect('/login');
  return <VenuesClient />;
}
