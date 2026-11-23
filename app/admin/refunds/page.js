import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import RefundsClient from './RefundsClient';

export const dynamic = 'force-dynamic';

export default async function AdminRefundsPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') redirect('/login');
  return <RefundsClient />;
}
