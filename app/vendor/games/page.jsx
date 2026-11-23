import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import GamesClient from './GamesClient';

export const dynamic = 'force-dynamic';

export default async function VendorGamesPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') redirect('/login');
  return <GamesClient />;
}
