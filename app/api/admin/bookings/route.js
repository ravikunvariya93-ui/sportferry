import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { auth } from '@/lib/auth';

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user?.role !== 'ADMIN') return null;
  return session;
}

export async function GET(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    await dbConnect();

    const query = {};
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        query.date.$lte = to;
      }
    }

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('venue', 'name city area')
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query),
    ]);

    return NextResponse.json({
      bookings: bookings.map((b) => ({
        id: b._id.toString(),
        venueName: b.venue?.name || 'N/A',
        venueCity: b.venue?.city || '',
        venueArea: b.venue?.area || '',
        userName: b.user?.name || b.offlineCustomerName || 'Walk-in',
        userEmail: b.user?.email || '',
        userPhone: b.user?.phone || b.offlineCustomerPhone || '',
        date: b.date,
        dateStr: new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        startTime: b.startTime,
        endTime: b.endTime,
        slot: `${b.startTime} – ${b.endTime}`,
        status: b.status,
        classification: b.classification || 'SOLO',
        playersCount: b.playersCount || 1,
        bookingType: b.bookingType,
        amount: b.totalAmount,
        paymentId: b.paymentId || '',
        createdAt: b.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[GET /api/admin/bookings]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { bookingId, status } = await request.json();
    if (!bookingId || !status) return NextResponse.json({ message: 'bookingId and status are required' }, { status: 400 });
    if (!['PENDING', 'CONFIRMED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    await dbConnect();
    const booking = await Booking.findByIdAndUpdate(bookingId, { status }, { new: true });
    if (!booking) return NextResponse.json({ message: 'Booking not found' }, { status: 404 });

    return NextResponse.json({ id: booking._id.toString(), status: booking.status });
  } catch (error) {
    console.error('[PATCH /api/admin/bookings]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
