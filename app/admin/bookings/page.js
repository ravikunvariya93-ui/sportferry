import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BookingsClient from './BookingsClient';

export const dynamic = 'force-dynamic';

export default async function AdminBookingsPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') redirect('/login');
  return <BookingsClient />;
}
