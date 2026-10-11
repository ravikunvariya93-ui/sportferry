import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import VendorNav from './VendorNav';

export const dynamic = 'force-dynamic';

export default async function VendorLayout({ children }) {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') {
    redirect('/login');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <VendorNav />
      {children}
    </div>
  );
}
