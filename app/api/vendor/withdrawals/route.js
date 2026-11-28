import { NextResponse } from 'next/server';
import { formatINR } from '@/lib/format';
import { apiError, forbidden, conflict } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Withdrawal from '@/models/Withdrawal';
import PayoutBatch from '@/models/PayoutBatch';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { requireVendorSession as requireVendor } from '@/lib/apiGuards';
import { istTodayISO } from '@/lib/ist';
import { COMMISSION_PERCENT } from '@/lib/constants';
import { settledAmountForVendor } from '@/lib/payouts';

export async function GET(request) {
  try {
    const session = await requireVendor();
    if (!session) return forbidden();

    await dbConnect();

    const withdrawals = await Withdrawal.find({ vendor: session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      withdrawals: withdrawals.map(w => ({
        id: w._id.toString(),
        amount: w.amount,
        commissionDeducted: w.commissionDeducted,
        netAmount: w.netAmount,
        status: w.status,
        month: w.month,
        year: w.year,
        requestedAt: w.requestedAt,
        processedAt: w.processedAt,
        adminNotes: w.adminNotes,
      })),
    });
  } catch (error) {
    return apiError(error, 'GET /api/vendor/withdrawals');
  }
}

export async function POST(request) {
  try {
    const session = await requireVendor();
    if (!session) return forbidden();

    await dbConnect();

    const now = new Date();
    const [currentYear, currentMonth] = istTodayISO().split('-').map(Number);

    // Check if already requested this month
    const existing = await Withdrawal.findOne({
      vendor: session.user.id,
      month: currentMonth,
      year: currentYear,
    });

    if (existing) {
      return NextResponse.json({
        message: `You have already requested a withdrawal for ${now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}. Status: ${existing.status}`,
      }, { status: 409 });
    }

    // Calculate earnings for confirmed bookings
    const venues = await Venue.find({ owner: session.user.id }).select('_id').lean();
    const venueIds = venues.map(v => v._id);

    const confirmedBookings = await Booking.find({
      venue: { $in: venueIds },
      status: 'CONFIRMED',
      bookingType: 'ONLINE',
    }).lean();

    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const commissionDeducted = Math.round(totalRevenue * COMMISSION_PERCENT / 100);
    const netAmount = totalRevenue - commissionDeducted;

    // Completed/processing payout batches and live withdrawals both reduce
    // the balance — otherwise an admin settlement can be withdrawn twice.
    const [withdrawals, batches] = await Promise.all([
      Withdrawal.find({ vendor: session.user.id }).lean(),
      PayoutBatch.find({ vendor: session.user.id }).lean(),
    ]);
    const settled = settledAmountForVendor({ withdrawals, batches });

    const availableBalance = netAmount - settled;

    if (availableBalance <= 0) {
      return NextResponse.json({
        message: 'No available balance for withdrawal.',
      }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));

    // `amount` (gross) and `commissionDeducted` describe THIS payout, so that
    // amount - commissionDeducted === netAmount for every withdrawal.
    const grossAmount = Math.round(availableBalance * 100 / (100 - COMMISSION_PERCENT));

    const withdrawal = await Withdrawal.create({
      vendor: session.user.id,
      amount: grossAmount,
      commissionDeducted: grossAmount - availableBalance,
      netAmount: availableBalance,
      month: currentMonth,
      year: currentYear,
      vendorNotes: body.notes || '',
    });

    return NextResponse.json({
      id: withdrawal._id.toString(),
      netAmount: availableBalance,
      message: `Withdrawal of ${formatINR(availableBalance)} requested successfully.`,
    }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return conflict('Withdrawal already requested for this month.');
    }
    return apiError(error, 'POST /api/vendor/withdrawals');
  }
}
