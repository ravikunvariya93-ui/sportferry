import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BookingDetailClient from './BookingDetailClient';

export const dynamic = 'force-dynamic';

export default async function VendorBookingDetailPage({ params }) {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') redirect('/login');
  return <BookingDetailClient bookingId={params.id} />;
}
