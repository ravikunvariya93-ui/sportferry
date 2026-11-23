import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PayoutsClient from './PayoutsClient';

export const dynamic = 'force-dynamic';

export default async function AdminPayoutsPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') redirect('/login');
  return <PayoutsClient />;
}
