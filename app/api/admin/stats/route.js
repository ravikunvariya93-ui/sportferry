import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Venue from '@/models/Venue';
import Booking from '@/models/Booking';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const [
      totalUsers,
      totalVendors,
      totalVenues,
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
    ] = await Promise.all([
      User.countDocuments({ role: 'USER' }),
      User.countDocuments({ role: 'VENDOR' }),
      Venue.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'CONFIRMED' }),
      Booking.countDocuments({ status: 'PENDING' }),
      Booking.countDocuments({ status: 'CANCELLED' }),
    ]);

    // Revenue from confirmed bookings
    const revenueAgg = await Booking.aggregate([
      { $match: { status: 'CONFIRMED' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // New users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } });

    // Bookings today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const bookingsToday = await Booking.countDocuments({ createdAt: { $gte: startOfDay } });

    // Recent bookings (last 10)
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('venue', 'name city')
      .populate('user', 'name email')
      .lean();

    // Top venues by booking count
    const topVenues = await Booking.aggregate([
      { $group: { _id: '$venue', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'venues',
          localField: '_id',
          foreignField: '_id',
          as: 'venueData',
        },
      },
      { $unwind: { path: '$venueData', preserveNullAndEmpty: true } },
      {
        $project: {
          _id: 1,
          count: 1,
          revenue: 1,
          name: '$venueData.name',
          city: '$venueData.city',
        },
      },
    ]);

    // Monthly bookings for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyBookings = await Booking.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const serializedRecent = recentBookings.map((b) => ({
      id: b._id.toString(),
      venueName: b.venue?.name || 'N/A',
      venueCity: b.venue?.city || '',
      userName: b.user?.name || b.offlineCustomerName || 'Walk-in',
      userEmail: b.user?.email || '',
      status: b.status,
      bookingType: b.bookingType,
      amount: b.totalAmount,
      dateStr: new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      createdAt: b.createdAt,
    }));

    return NextResponse.json({
      totalUsers,
      totalVendors,
      totalVenues,
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      totalRevenue,
      newUsersThisMonth,
      bookingsToday,
      recentBookings: serializedRecent,
      topVenues: topVenues.map((v) => ({
        id: v._id.toString(),
        name: v.name || 'Unknown',
        city: v.city || '',
        count: v.count,
        revenue: v.revenue,
      })),
      monthlyBookings: monthlyBookings.map((m) => ({
        label: new Date(m._id.year, m._id.month - 1).toLocaleString('en-IN', { month: 'short' }),
        count: m.count,
        revenue: m.revenue,
      })),
    });
  } catch (error) {
    console.error('[GET /api/admin/stats]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
