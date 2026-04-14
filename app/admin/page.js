import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Venue from '@/models/Venue';
import Booking from '@/models/Booking';
import AdminOverviewClient from './AdminOverviewClient';

export const dynamic = 'force-dynamic';

async function getStats() {
  await dbConnect();

  const [
    totalUsers, totalVendors, totalVenues, totalBookings,
    confirmedBookings, pendingBookings, cancelledBookings,
  ] = await Promise.all([
    User.countDocuments({ role: 'USER' }),
    User.countDocuments({ role: 'VENDOR' }),
    Venue.countDocuments(),
    Booking.countDocuments({ bookingType: { $ne: 'OFFLINE' } }),
    Booking.countDocuments({ status: 'CONFIRMED', bookingType: { $ne: 'OFFLINE' } }),
    Booking.countDocuments({ status: 'PENDING', bookingType: { $ne: 'OFFLINE' } }),
    Booking.countDocuments({ status: 'CANCELLED', bookingType: { $ne: 'OFFLINE' } }),
  ]);

  const revenueAgg = await Booking.aggregate([
    { $match: { status: 'CONFIRMED', bookingType: { $ne: 'OFFLINE' } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);
  const totalRevenue = revenueAgg[0]?.total || 0;

  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const bookingsToday = await Booking.countDocuments({ 
    createdAt: { $gte: startOfDay },
    bookingType: { $ne: 'OFFLINE' }
  });

  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
  const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } });

  // Recent bookings
  const recentRaw = await Booking.find()
    .sort({ createdAt: -1 }).limit(10)
    .populate('venue', 'name city')
    .populate('user', 'name email')
    .lean();

  const recentBookings = recentRaw.map((b) => ({
    id: b._id.toString(),
    venueName: b.venue?.name || 'N/A',
    venueCity: b.venue?.city || '',
    userName: b.user?.name || b.offlineCustomerName || 'Walk-in',
    status: b.status,
    amount: b.totalAmount,
    dateStr: new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    createdAt: b.createdAt?.toISOString(),
  }));

  // Top venues
  const topVenuesRaw = await Booking.aggregate([
    { $match: { bookingType: { $ne: 'OFFLINE' } } },
    { $group: { _id: '$venue', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
    { $sort: { count: -1 } }, { $limit: 5 },
    { $lookup: { from: 'venues', localField: '_id', foreignField: '_id', as: 'v' } },
    { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
    { $project: { count: 1, revenue: 1, name: '$v.name', city: '$v.city' } },
  ]);
  const topVenues = topVenuesRaw.map((v) => ({
    id: v._id.toString(), name: v.name || 'Unknown', city: v.city || '', count: v.count, revenue: v.revenue,
  }));

  // Monthly data (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1); sixMonthsAgo.setHours(0, 0, 0, 0);
  const monthlyRaw = await Booking.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo }, bookingType: { $ne: 'OFFLINE' } } },
    { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
  const monthlyBookings = monthlyRaw.map((m) => ({
    label: new Date(m._id.year, m._id.month - 1).toLocaleString('en-IN', { month: 'short' }),
    count: m.count,
    revenue: m.revenue,
  }));

  return {
    totalUsers, totalVendors, totalVenues, totalBookings,
    confirmedBookings, pendingBookings, cancelledBookings,
    totalRevenue, bookingsToday, newUsersThisMonth,
    recentBookings, topVenues, monthlyBookings,
  };
}

export default async function AdminOverviewPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') redirect('/login');

  const stats = await getStats();
  return <AdminOverviewClient stats={stats} />;
}
