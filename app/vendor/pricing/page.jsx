import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { loadVendorData } from '@/lib/vendorData';
import PricingClient from './PricingClient';

export const dynamic = 'force-dynamic';

export default async function VendorPricingPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') redirect('/login');

  const { venues } = await loadVendorData(session.user.id);
  if (!venues.length) redirect('/vendor/onboarding');

  const mapped = venues.map(v => ({
    id: v.id,
    name: v.name,
    city: v.city,
    pricePerHour: v.pricePerHour,
    discountPercent: v.discountPercent || 0,
    pricing: v.pricing || {},
  }));

  return <PricingClient venues={mapped} />;
}
