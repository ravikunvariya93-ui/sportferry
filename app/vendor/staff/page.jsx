import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import StaffClient from './StaffClient';

export const dynamic = 'force-dynamic';

export default async function VendorStaffPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') redirect('/login');
  return <StaffClient />;
}
