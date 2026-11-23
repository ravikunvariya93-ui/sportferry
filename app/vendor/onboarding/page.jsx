import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Venue from '@/models/Venue';
import { loadTurfs } from '@/lib/turfs';
import OnboardingWizard from './OnboardingWizard';

export const dynamic = 'force-dynamic';

export default async function VendorOnboardingPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') redirect('/login');

  await dbConnect();
  const user = await User.findById(session.user.id).select('name email phone bankDetails').lean();
  const venue = await Venue.findOne({ owner: session.user.id }).sort({ createdAt: 1 }).lean();
  const turfs = venue ? await loadTurfs(venue._id) : [];

  const initial = venue ? {
    venueId: venue._id.toString(),
    venue: {
      name: venue.name || '',
      city: venue.city || '',
      area: venue.area || '',
      address: venue.address || '',
      sportTypes: venue.sportTypes || [],
      amenities: venue.amenities || [],
      images: venue.images || [],
      discountPercent: venue.discountPercent || 0,
      pricing: {
        weekday: venue.pricing?.weekday ?? venue.pricePerHour ?? '',
        weekend: venue.pricing?.weekend ?? '',
        peak: venue.pricing?.peak ?? '',
      },
      documents: venue.documents || {},
    },
    turfs: turfs.map(t => ({ name: t.name, sport: t.sport, size: t.size || { unit: 'Feet' }, surface: t.surface, playingFormat: t.playingFormat, lighting: t.lighting })),
  } : null;

  return (
    <OnboardingWizard
      userName={user?.name || session.user.name}
      userEmail={user?.email || session.user.email}
      initialPhone={user?.phone || ''}
      initialBank={user?.bankDetails || {}}
      initial={initial}
    />
  );
}
