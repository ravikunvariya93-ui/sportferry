import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') redirect('/login');
  return <SettingsClient />;
}
