import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import User from '@/models/User';
import { auth, hasRole } from '@/lib/auth';

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csvResponse = (header, rows) => new NextResponse(
  [header, ...rows.map(r => r.map(csvCell).join(','))].join('\n'),
  { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="report.csv"' } }
);

export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !(await hasRole(session, 'ADMIN'))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const type = new URL(request.url).searchParams.get('type') || 'bookings';
    await dbConnect();

    if (type === 'bookings') {
      const rows = await Booking.find({ status: { $ne: 'PAYMENT_PENDING' } })
        .populate('venue', 'name city').populate('user', 'name email')
        .select('date startTime endTime totalAmount status classification bookingType offlineCustomerName')
        .sort({ createdAt: -1 }).limit(5000).lean();
      return csvResponse(
        ['Booking', 'Date', 'Slot', 'Venue', 'City', 'Customer', 'Type', 'Class', 'Amount', 'Status'],
        rows.map((b, i) => [b._id.toString().slice(-5).toUpperCase(), new Date(b.date).toISOString().slice(0, 10), `${b.startTime}-${b.endTime}`, b.venue?.name, b.venue?.city, b.user?.name || b.offlineCustomerName || '', b.bookingType, b.classification, b.totalAmount, b.status])
      );
    }

    if (type === 'revenue') {
      const rows = await Booking.aggregate([
        { $match: { status: 'CONFIRMED' } },
        { $lookup: { from: 'venues', localField: 'venue', foreignField: '_id', as: 'v' } },
        { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$venue', bookings: { $sum: 1 }, gross: { $sum: '$totalAmount' }, name: { $first: '$v.name' }, city: { $first: '$v.city' } } },
        { $sort: { gross: -1 } },
      ]);
      return csvResponse(['Venue', 'City', 'Bookings', 'Gross', 'Commission (12%)', 'Net'],
        rows.map(r => [r.name, r.city, r.bookings, r.gross, Math.round(r.gross * 0.12), r.gross - Math.round(r.gross * 0.12)]));
    }

    const venues = await Venue.find({}).populate('owner', 'name email').select('name city area numberOfTurfs sportTypes onboardingStatus').lean();
    return csvResponse(['Venue', 'City', 'Area', 'Turfs', 'Sports', 'Owner', 'Email', 'Status'],
      venues.map(v => [v.name, v.city, v.area, v.numberOfTurfs, (v.sportTypes || []).join(' '), v.owner?.name, v.owner?.email, v.onboardingStatus]));
  } catch (error) {
    return apiError(error, 'GET /api/admin/reports');
  }
}
