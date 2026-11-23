import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { loadVendorData } from '@/lib/vendorData';
import { istTodayISO } from '@/lib/ist';
import CalendarClient from './CalendarClient';

export const dynamic = 'force-dynamic';

export default async function VendorCalendarPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') redirect('/login');

  const { venues } = await loadVendorData(session.user.id);
  if (!venues.length) redirect('/vendor/onboarding');

  const mapped = venues.map(v => ({ id: v.id, name: v.name, sportTypes: v.sportTypes, turfs: v.turfs || [] }));

  return <CalendarClient venues={mapped} initialDate={istTodayISO()} />;
}
