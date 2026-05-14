import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { auth } from '@/lib/auth';
import { calculateRefund } from '@/lib/cancellationPolicy';

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
    let limit = parseInt(searchParams.get('limit') || '25');
    if (limit > 100) limit = 100;
    if (limit < 1) limit = 1;
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const venueId = searchParams.get('venueId') || '';
    const city = searchParams.get('city') || '';
    const bookingType = searchParams.get('bookingType') || '';
    const classification = searchParams.get('classification') || '';
    const search = searchParams.get('search') || '';

    await dbConnect();

    const query = { status: { $ne: 'PAYMENT_PENDING' } };
    if (status) query.status = status;
    if (bookingType) query.bookingType = bookingType;
    if (classification) query.classification = classification;
    if (venueId) query.venue = venueId;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        query.date.$gte = from;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        query.date.$lte = to;
      }
    }

    // For city filter, we need to find venue IDs in that city first
    if (city && !venueId) {
      const Venue = (await import('@/models/Venue')).default;
      const venuesInCity = await Venue.find({ city }).select('_id').lean();
      query.venue = { $in: venuesInCity.map(v => v._id) };
    }

    // For search, we need to find matching users first
    let userFilter = null;
    if (search) {
      const User = (await import('@/models/User')).default;
      const searchRegex = new RegExp(search, 'i');
      const matchingUsers = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
        ]
      }).select('_id').lean();
      userFilter = matchingUsers.map(u => u._id);
      
      // Also match offline customer name/phone
      query.$or = [
        { user: { $in: userFilter } },
        { offlineCustomerName: searchRegex },
        { offlineCustomerPhone: searchRegex },
      ];
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
        // Cancellation metadata
        cancelledBy: b.cancelledBy || null,
        cancelledAt: b.cancelledAt || null,
        cancellationReason: b.cancellationReason || null,
        refundPercent: b.refundPercent ?? 0,
        refundAmount: b.refundAmount ?? 0,
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

    const { bookingId, status, cancellationReason } = await request.json();
    if (!bookingId || !status) return NextResponse.json({ message: 'bookingId and status are required' }, { status: 400 });
    if (!['PENDING', 'CONFIRMED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    await dbConnect();
    const booking = await Booking.findById(bookingId);
    if (!booking) return NextResponse.json({ message: 'Booking not found' }, { status: 404 });

    booking.status = status;

    // Track cancellation metadata for admin-initiated cancellations
    if (status === 'CANCELLED' && !booking.cancelledBy) {
      const refund = calculateRefund(booking, 'ADMIN');
      booking.cancelledBy = 'ADMIN';
      booking.cancelledAt = new Date();
      booking.cancellationReason = cancellationReason?.trim() || 'Cancelled by admin';
      booking.refundPercent = refund.refundPercent;
      booking.refundAmount = refund.refundAmount;
    }

    await booking.save();

    return NextResponse.json({ id: booking._id.toString(), status: booking.status });
  } catch (error) {
    console.error('[PATCH /api/admin/bookings]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
