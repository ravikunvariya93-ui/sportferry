import { auth, hasRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import VendorSidebar from './VendorSidebar';

export const dynamic = 'force-dynamic';

export default async function VendorLayout({ children }) {
  const session = await auth();
  if (!session || !(await hasRole(session, 'VENDOR'))) {
    redirect('/login');
  }

  return (
    <>
      <VendorSidebar />
      {children}
    </>
  );
}
