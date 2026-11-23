import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Venue from '@/models/Venue';
import Booking from '@/models/Booking';
import Turf from '@/models/Turf';
import { releaseExpiredPendingBookings } from '@/lib/booking-utils';
import { COMMISSION_PERCENT } from '@/lib/constants';
import { PLAYERS_PER_SIDE } from '@/lib/capacity';
import { commissionOf, bookingTypeBreakdown, dailyTrend, fillRatePct } from '@/lib/adminStats';
import AdminOverviewClient from './AdminOverviewClient';

export const dynamic = 'force-dynamic';

async function getStats() {
  await dbConnect();

  // Keep the PENDING badge from counting bookings whose slot already passed.
  await releaseExpiredPendingBookings();

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalBookings, cancelledBookings, pendingBookings, confirmedBookings,
    bookingsToday, newUsersThisMonth,
    totalTurfs, activeVenues, registeredUsers, pendingVendors,
    allBookings, recentRaw, topVenuesRaw,
  ] = await Promise.all([
    Booking.countDocuments({ status: { $ne: 'PAYMENT_PENDING' } }),
    Booking.countDocuments({ status: 'CANCELLED' }),
    Booking.countDocuments({ status: 'PENDING' }),
    Booking.countDocuments({ status: 'CONFIRMED' }),
    Booking.countDocuments({ createdAt: { $gte: startOfDay }, status: { $ne: 'PAYMENT_PENDING' } }),
    User.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Turf.countDocuments({}),
    Venue.countDocuments({ onboardingStatus: 'ACTIVE' }),
    User.countDocuments({ role: 'PLAYER' }),
    Venue.countDocuments({ onboardingStatus: 'PENDING' }),
    Booking.find({ status: { $ne: 'PAYMENT_PENDING' } })
      .select('totalAmount playersCount classification bookingType status createdAt')
      .lean(),
    Booking.find({ status: { $ne: 'PAYMENT_PENDING' } })
      .sort({ createdAt: -1 }).limit(10)
      .populate('venue', 'name city')
      .populate('user', 'name email')
      .select('venue user status totalAmount date bookingType offlineCustomerName')
      .lean(),
    Booking.aggregate([
      { $match: { status: { $nin: ['PAYMENT_PENDING', 'CANCELLED'] } } },
      { $group: { _id: '$venue', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { count: -1 } }, { $limit: 5 },
      { $lookup: { from: 'venues', localField: '_id', foreignField: '_id', as: 'v' } },
      { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
      { $project: { count: 1, revenue: 1, name: '$v.name', city: '$v.city' } },
    ]),
  ]);

  const nonCancelled = allBookings.filter(b => b.status !== 'CANCELLED');
  const totalPlayers = nonCancelled.reduce((s, b) => s + (b.playersCount || 0), 0);
  const grossBookingValue = allBookings.filter(b => b.status === 'CONFIRMED').reduce((s, b) => s + (b.totalAmount || 0), 0);
  const commission = commissionOf(grossBookingValue, COMMISSION_PERCENT);

  const last30 = allBookings.filter(b => b.createdAt && new Date(b.createdAt) >= since);
  const players30 = last30.reduce((s, b) => s + (b.playersCount || 0), 0);
  const monthlyCapacity = Math.max(1, activeVenues) * 4 * PLAYERS_PER_SIDE * 2 * 30;

  return {
    totalBookings, cancelledBookings, pendingBookings, confirmedBookings,
    bookingsToday, newUsersThisMonth,
    totalPlayers, grossBookingValue, commission, commissionPercent: COMMISSION_PERCENT,
    totalTurfs, activeVenues, registeredUsers, pendingVendors,
    fillRate: fillRatePct(players30, monthlyCapacity),
    trend: dailyTrend(nonCancelled, 30),
    breakdown: bookingTypeBreakdown(nonCancelled),
    topVenues: topVenuesRaw.map((v) => ({
      id: v._id.toString(), name: v.name || 'Unknown', city: v.city || '', count: v.count, revenue: v.revenue,
    })),
    recentBookings: recentRaw.map((b) => ({
      id: b._id.toString(),
      venueName: b.venue?.name || 'N/A',
      venueCity: b.venue?.city || '',
      userName: b.user?.name || b.offlineCustomerName || 'Walk-in',
      userId: b.user?._id?.toString() || null,
      status: b.status,
      amount: b.totalAmount,
      dateStr: new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      createdAt: b.createdAt?.toISOString(),
    })),
  };
}

export default async function AdminOverviewPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') redirect('/login');

  const stats = await getStats();
  return <AdminOverviewClient stats={stats} />;
}
