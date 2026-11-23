import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { loadVendorData } from '@/lib/vendorData';
import CustomersClient from './CustomersClient';

export const dynamic = 'force-dynamic';

export default async function VendorCustomersPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') redirect('/login');
  const { customers } = await loadVendorData(session.user.id);
  return <CustomersClient customers={customers} />;
}
