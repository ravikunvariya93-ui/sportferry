import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PromotionsClient from './PromotionsClient';

export const dynamic = 'force-dynamic';

export default async function AdminPromotionsPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') redirect('/login');
  return <PromotionsClient />;
}
