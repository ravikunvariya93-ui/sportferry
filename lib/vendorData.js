import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import Booking from '@/models/Booking';
import User from '@/models/User';
import { COMMISSION_PERCENT } from '@/lib/constants';
import { releaseExpiredPendingBookings } from '@/lib/booking-utils';
import { loadTurfsForVenues } from '@/lib/turfs';
import { PLAYERS_PER_SIDE } from '@/lib/capacity';
import { dailyTrend } from '@/lib/adminStats';
import { formatBookingDate, formatSlotLabel } from '@/lib/ist';
import { commissionOf } from '@/lib/payouts';

/**
 * Loads everything the vendor dashboard/pages need, scoped to the owner.
 * Returns { venues, bookings, customers, stats, earnings }.
 */
export async function loadVendorData(ownerId) {
  await dbConnect();

  const rawVenues = await Venue.find({ owner: ownerId }).lean();
  const venueIds = rawVenues.map(v => v._id);

  const turfsByVenue = await loadTurfsForVenues(venueIds);
  const venues = rawVenues.map(v => ({
    ...v,
    _id: v._id.toString(),
    owner: v.owner.toString(),
    id: v._id.toString(),
    turfs: (turfsByVenue[v._id.toString()] || []).map(t => ({ ...t, _id: t._id.toString(), venue: t.venue.toString(), id: t._id.toString() })),
  }));

  const owner = await User.findById(ownerId).select('bankDetails phone').lean();

  // Past slots that never filled are stale — cancel them before listing.
  await releaseExpiredPendingBookings({ venue: { $in: venueIds } });

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
    dateStr: formatBookingDate(b.date),
    slot: formatSlotLabel(b.startTime, b.endTime, { ampm: false }),
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
      customerMap.set(uid, { id: uid, name: b.user?.name || 'Unknown User', bookings: 0, spent: 0, lastBookingAt: null });
    }
    const c = customerMap.get(uid);
    c.bookings += 1;
    if (b.status === 'CONFIRMED') c.spent += (b.totalAmount || 0);
    if (!c.lastBookingAt || new Date(b.date) > new Date(c.lastBookingAt)) c.lastBookingAt = b.date;
  }
  const customers = [...customerMap.values()].sort((a, b) => b.spent - a.spent || b.bookings - a.bookings);

  // Earnings (online + confirmed only; 12% commission).
  const grossEarnings = onlineBookings
    .filter(b => b.status === 'CONFIRMED')
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const commission = commissionOf(grossEarnings, COMMISSION_PERCENT);
  const netEarnings = grossEarnings - commission;

  const activeVenues = venues.filter(v => v.onboardingStatus === 'ACTIVE' || !v.onboardingStatus).length;

  const stats = [
    { label: 'Earnings (after 12% commission)', value: `₹${netEarnings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, iconName: 'TrendingUp', color: '#10b981', href: '/vendor/earnings' },
    { label: 'Total Bookings', value: onlineBookings.length.toString(), iconName: 'Calendar', color: '#38bdf8', href: '/vendor/bookings' },
    { label: 'Active Venues', value: activeVenues.toString(), iconName: 'LayoutDashboard', color: '#fbbf24', href: '/vendor/grounds' },
    { label: 'Customers', value: customers.length.toString(), iconName: 'Users', color: '#f472b6', href: '/vendor/customers' },
  ];

  // Dashboard KPIs + charts.
  const nonCancelled = rawBookings.filter(b => b.status !== 'CANCELLED');
  const totalPlayers = nonCancelled.reduce((s, b) => s + (b.playersCount || 0), 0);
  const onlineCount = rawBookings.filter(b => b.bookingType !== 'OFFLINE').length;
  const offlineCount = rawBookings.filter(b => b.bookingType === 'OFFLINE').length;
  const turfTotal = venues.reduce((s, v) => s + Math.max(1, Number(v.numberOfTurfs) || 1), 0);
  const monthCapacity = turfTotal * (PLAYERS_PER_SIDE * 2) * 30;
  const occupancy = monthCapacity ? Math.min(100, Math.round((totalPlayers / monthCapacity) * 100)) : 0;

  // IST-bucketed (a 01:30 IST booking belongs to that IST day, not the previous UTC one).
  const trend = dailyTrend(rawBookings, 14);

  return {
    venues,
    bookings,
    customers,
    stats,
    kpis: { totalBookings: nonCancelled.length, players: totalPlayers, occupancy },
    sourceSplit: { online: onlineCount, offline: offlineCount },
    trend,
    bankDetails: owner?.bankDetails || {},
    onboarding: {
      // A brand-new owner with no venue yet is sent to the wizard.
      needsOnboarding: venues.length === 0,
    },
    activeVenues,
    earnings: { gross: grossEarnings, commission, net: netEarnings, commissionPercent: COMMISSION_PERCENT },
  };
}
