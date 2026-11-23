import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import VendorDetailClient from './VendorDetailClient';

export const dynamic = 'force-dynamic';

export default async function AdminVendorDetailPage({ params }) {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') redirect('/login');
  return <VendorDetailClient venueId={params.id} />;
}
