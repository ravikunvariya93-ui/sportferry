import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { auth, hasRole } from '@/lib/auth';
import { executeRefund } from '@/lib/refunds';
import { bookingRef } from '@/lib/bookingRef';
import { releaseExpiredPendingBookings } from '@/lib/booking-utils';

async function requireAdmin() {
  const session = await auth();
  if (!session || !(await hasRole(session, 'ADMIN'))) return null;
  return session;
}

/** Map a booking's refundStatus onto the refund-queue status. */
function refundQueueStatus(refundStatus) {
  if (refundStatus === 'COMPLETED') return 'COMPLETED';
  if (refundStatus === 'FAILED') return 'FAILED';
  return 'PENDING'; // NONE or PENDING → still owed
}

export async function GET(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const format = new URL(request.url).searchParams.get('format');
    await dbConnect();
    await releaseExpiredPendingBookings();

    const bookings = await Booking.find({ status: 'CANCELLED' })
      .populate('venue', 'name')
      .populate('user', 'name')
      .sort({ cancelledAt: -1 })
      .limit(300)
      .lean();

    const rows = bookings.map(b => ({
      id: b._id.toString(),
      ref: bookingRef(b._id),
      userName: b.user?.name || b.offlineCustomerName || 'Walk-in',
      venueName: b.venue?.name || 'N/A',
      turf: b.turf || 1,
      classification: b.classification || 'SOLO',
      bookingType: b.bookingType,
      amount: b.totalAmount || 0,
      refundAmount: b.refundAmount || 0,
      method: b.paymentId ? 'Razorpay' : '—',
      reason: b.cancellationReason || b.cancelledBy || '',
      refundStatus: b.refundStatus || 'NONE',
      status: refundQueueStatus(b.refundStatus),
      paymentId: b.paymentId || '',
    }));

    if (format === 'csv') {
      const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const lines = ['Booking ID,Player,Venue,Turf,Type,Amount,Refund Amount,Method,Reason,Status',
        ...rows.map(r => [r.ref, r.userName, r.venueName, r.turf, r.classification, r.amount, r.refundAmount, r.method, r.reason, r.status].map(cell).join(','))];
      return new NextResponse(lines.join('\n'), {
        status: 200,
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="refund-report.csv"' },
      });
    }

    const kpis = {
      refundable: rows.filter(r => r.status === 'PENDING').reduce((s, r) => s + r.refundAmount, 0),
      cancelledBookings: rows.length,
      processed: rows.filter(r => r.status === 'COMPLETED').reduce((s, r) => s + r.refundAmount, 0),
      pendingCount: rows.filter(r => r.status === 'PENDING').length,
    };
    const counts = {
      ALL: rows.length,
      PENDING: kpis.pendingCount,
      COMPLETED: rows.filter(r => r.status === 'COMPLETED').length,
      FAILED: rows.filter(r => r.status === 'FAILED').length,
    };

    return NextResponse.json({ refunds: rows, kpis, counts });
  } catch (error) {
    console.error('[GET /api/admin/refunds]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { bookingIds } = await request.json();
    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return NextResponse.json({ message: 'Select at least one booking.' }, { status: 400 });
    }

    await dbConnect();
    let completed = 0;
    let failed = 0;
    let skipped = 0;

    for (const id of bookingIds) {
      if (!/^[a-f\d]{24}$/i.test(String(id))) { skipped += 1; continue; }

      // Claim the booking atomically so two admins (or a retry) can never refund
      // the same payment twice.
      const claimed = await Booking.findOneAndUpdate(
        {
          _id: id,
          status: 'CANCELLED',
          bookingType: 'ONLINE',
          paymentId: { $ne: null },
          refundAmount: { $gt: 0 },
          refundStatus: { $ne: 'COMPLETED' },
        },
        { $set: { refundStatus: 'PENDING' } },
        { new: true }
      );
      if (!claimed) { skipped += 1; continue; }

      const result = await executeRefund(claimed, claimed.refundAmount);
      const update = { refundStatus: result.status };
      if (result.refundId) update.refundId = result.refundId;
      await Booking.updateOne({ _id: id }, { $set: update });

      if (result.status === 'COMPLETED') completed += 1;
      else if (result.status === 'FAILED') failed += 1;
      else skipped += 1;
    }

    return NextResponse.json({ completed, failed, skipped });
  } catch (error) {
    console.error('[POST /api/admin/refunds]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
