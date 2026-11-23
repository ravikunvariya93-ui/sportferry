import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function VendorSettingsPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') redirect('/login');
  return <SettingsClient />;
}
