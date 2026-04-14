import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';
import Booking from '@/models/Booking';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import VendorDashboardClient from './VendorDashboardClient';

export const dynamic = 'force-dynamic';

export default async function VendorDashboard() {
  const session = await auth();

  if (!session || session.user.role !== 'VENDOR') {
    redirect('/login');
  }

  await dbConnect();

  // ── Venues ─────────────────────────────────────────────────────────────
  const rawVenues = await Venue.find({ owner: session.user.id }).lean();
  const vendorVenues = rawVenues.map(v => ({
    ...v,
    _id: v._id.toString(),
    owner: v.owner.toString(),
    id: v._id.toString(),
  }));

  const venueIds = rawVenues.map(v => v._id);

  // ── All Bookings for this vendor's venues ───────────────────────────────
  const rawBookings = await Booking.find({ venue: { $in: venueIds } })
    .populate('user', 'name')
    .populate('venue', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const allBookings = rawBookings.map(b => ({
    id: b._id.toString(),
    userName: b.bookingType === 'OFFLINE' ? (b.offlineCustomerName || 'Offline Customer') : (b.user?.name || 'Unknown User'),
    userInitials: b.bookingType === 'OFFLINE' ? 'OC' : (b.user?.name ? b.user.name.substring(0, 2).toUpperCase() : '??'),
    venueName: b.venue?.name || 'Unknown Venue',
    dateStr: new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    slot: `${b.startTime} – ${b.endTime}`,
    amount: b.totalAmount,
    status: b.status,
    bookingType: b.bookingType || 'ONLINE',
  }));

  // ── Stats ───────────────────────────────────────────────────────────────
  const SERVICE_FEE_PERCENT = 0.05;
  const rawRevenue = rawBookings
    .filter(b => b.status === 'CONFIRMED')
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  
  const totalEarnings = rawRevenue * (1 - SERVICE_FEE_PERCENT);

  const totalBookingsCount = rawBookings.length;

  const uniqueUserIds = new Set(rawBookings.map(b => b.user?._id?.toString()).filter(Boolean));
  const uniqueUsersCount = uniqueUserIds.size;

  const stats = [
    { label: 'Earnings (Net)',  value: `₹${totalEarnings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, iconName: 'TrendingUp',   color: '#10b981' },
    { label: 'Total Bookings', value: totalBookingsCount.toString(),                iconName: 'Calendar',     color: '#38bdf8' },
    { label: 'Active Venues',  value: vendorVenues.length.toString(),               iconName: 'LayoutDashboard', color: '#fbbf24' },
    { label: 'Customers',      value: uniqueUsersCount.toString(),               iconName: 'Users',        color: '#f472b6' },
  ];

  return (
    <VendorDashboardClient
      venues={vendorVenues}
      bookings={allBookings}
      stats={stats}
    />
  );
}
