import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminCalendarClient from './AdminCalendarClient';

export const dynamic = 'force-dynamic';

export default async function AdminCalendarPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') redirect('/login');
  return <AdminCalendarClient />;
}
