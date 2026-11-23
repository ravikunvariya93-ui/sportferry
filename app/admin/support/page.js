import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SupportClient from './SupportClient';

export const dynamic = 'force-dynamic';

export default async function AdminSupportPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') redirect('/login');
  return <SupportClient />;
}
