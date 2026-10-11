import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import Booking from '@/models/Booking';
import { COMMISSION_PERCENT } from '@/lib/constants';

/**
 * Loads everything the vendor dashboard/pages need, scoped to the owner.
 * Returns { venues, bookings, customers, stats, earnings }.
 */
export async function loadVendorData(ownerId) {
  await dbConnect();

  const rawVenues = await Venue.find({ owner: ownerId }).lean();
  const venues = rawVenues.map(v => ({
    ...v,
    _id: v._id.toString(),
    owner: v.owner.toString(),
    id: v._id.toString(),
  }));
  const venueIds = rawVenues.map(v => v._id);

  const rawBookings = await Booking.find({
    venue: { $in: venueIds },
    status: { $ne: 'PAYMENT_PENDING' },
  })
    .populate('user', 'name')
    .populate('venue', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const bookings = rawBookings.map(b => ({
    id: b._id.toString(),
    userName: b.bookingType === 'OFFLINE' ? (b.offlineCustomerName || 'Offline Customer') : (b.user?.name || 'Unknown User'),
    userInitials: b.bookingType === 'OFFLINE' ? 'OC' : (b.user?.name ? b.user.name.substring(0, 2).toUpperCase() : '??'),
    userId: b.bookingType === 'OFFLINE' ? null : (b.user?._id?.toString() || null),
    venueId: b.venue?._id?.toString() || null,
    venueName: b.venue?.name || 'Unknown Venue',
    dateStr: new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    slot: `${b.startTime} – ${b.endTime}`,
    amount: b.totalAmount,
    status: b.status,
    bookingType: b.bookingType || 'ONLINE',
    classification: b.classification || 'SOLO',
    playersCount: b.playersCount || 1,
    cancelledBy: b.cancelledBy || null,
    cancellationReason: b.cancellationReason || null,
    refundPercent: b.refundPercent ?? 0,
    refundAmount: b.refundAmount ?? 0,
  }));

  // Customers — unique users across the vendor's online bookings.
  const onlineBookings = rawBookings.filter(b => b.bookingType !== 'OFFLINE');
  const customerMap = new Map();
  for (const b of onlineBookings) {
    const uid = b.user?._id?.toString();
    if (!uid) continue;
    if (!customerMap.has(uid)) {
      customerMap.set(uid, { id: uid, name: b.user?.name || 'Unknown User', bookings: 0, spent: 0 });
    }
    const c = customerMap.get(uid);
    c.bookings += 1;
    if (b.status === 'CONFIRMED') c.spent += (b.totalAmount || 0);
  }
  const customers = [...customerMap.values()].sort((a, b) => b.spent - a.spent || b.bookings - a.bookings);

  // Earnings (online + confirmed only; 12% commission).
  const grossEarnings = onlineBookings
    .filter(b => b.status === 'CONFIRMED')
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const commission = Math.round(grossEarnings * COMMISSION_PERCENT / 100);
  const netEarnings = grossEarnings - commission;

  const stats = [
    { label: 'Earnings (after 12% commission)', value: `₹${netEarnings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, iconName: 'TrendingUp', color: '#10b981', href: '/vendor/earnings' },
    { label: 'Total Bookings', value: onlineBookings.length.toString(), iconName: 'Calendar', color: '#38bdf8', href: '/vendor/bookings' },
    { label: 'Active Venues', value: venues.length.toString(), iconName: 'LayoutDashboard', color: '#fbbf24', href: '/vendor/venues' },
    { label: 'Customers', value: customers.length.toString(), iconName: 'Users', color: '#f472b6', href: '/vendor/customers' },
  ];

  return {
    venues,
    bookings,
    customers,
    stats,
    earnings: { gross: grossEarnings, commission, net: netEarnings, commissionPercent: COMMISSION_PERCENT },
  };
}
