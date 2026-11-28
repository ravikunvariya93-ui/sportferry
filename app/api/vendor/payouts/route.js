import { NextResponse } from 'next/server';
import { requireVendorSession } from '@/lib/apiGuards';
import { apiError, forbidden } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import PayoutBatch from '@/models/PayoutBatch';
import Withdrawal from '@/models/Withdrawal';
import User from '@/models/User';


import { COMMISSION_PERCENT } from '@/lib/constants';
import { commissionOf, settledAmountForVendor } from '@/lib/payouts';

export async function GET(request) {
  try {
    const session = await requireVendorSession();
    if (!session) return forbidden();

    await dbConnect();
    const [bookings, batches, withdrawals, user] = await Promise.all([
      Booking.find({ status: 'CONFIRMED', bookingType: 'ONLINE' }).populate('venue', 'owner name').select('venue totalAmount').lean(),
      PayoutBatch.find({ vendor: session.user.id }).sort({ createdAt: -1 }).lean(),
      Withdrawal.find({ vendor: session.user.id }).sort({ createdAt: -1 }).lean(),
      User.findById(session.user.id).select('name bankDetails').lean(),
    ]);

    const mine = bookings.filter(b => b.venue?.owner && String(b.venue.owner) === session.user.id);
    const gross = mine.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const commission = commissionOf(gross, COMMISSION_PERCENT);
    const net = gross - commission;
    const settled = settledAmountForVendor({ withdrawals, batches });

    return NextResponse.json({
      kpis: { gross, commission, net, settled, payable: Math.max(0, net - settled), commissionPercent: COMMISSION_PERCENT },
      bank: user?.bankDetails || {},
      batches: batches.map(b => ({
        id: b._id.toString(), periodStart: b.periodStart, periodEnd: b.periodEnd,
        gross: b.gross, commission: b.commission, net: b.net,
        settledAmount: b.settledAmount ?? b.net, status: b.status, method: b.method, reference: b.reference,
      })),
      withdrawals: withdrawals.map(w => ({
        id: w._id.toString(), month: w.month, year: w.year,
        amount: w.amount, commissionDeducted: w.commissionDeducted, netAmount: w.netAmount,
        status: w.status, requestedAt: w.requestedAt,
      })),
    });
  } catch (error) {
    return apiError(error, 'GET /api/vendor/payouts');
  }
}
