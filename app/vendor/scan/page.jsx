import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ScanTicketClient from './ScanTicketClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Scan Ticket | Sportferry Vendor',
  description: 'Scan a customer e-ticket QR code to verify and check in a booking.',
};

export default async function VendorScanPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') redirect('/login');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '6px', letterSpacing: '-0.5px' }}>Scan Ticket</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Point the camera at a customer&apos;s Sportferry e-ticket QR to verify the booking and check them in.
        </p>
      </header>
      <ScanTicketClient />
    </div>
  );
}
