import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Withdrawal from '@/models/Withdrawal';
import Booking from '@/models/Booking';
import Venue from '@/models/Venue';
import { auth } from '@/lib/auth';

const COMMISSION_PERCENT = 12;

async function requireVendor() {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') return null;
  return session;
}

export async function GET(request) {
  try {
    const session = await requireVendor();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

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
    console.error('[GET /api/vendor/withdrawals]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireVendor();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    await dbConnect();

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

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

    // Get already withdrawn amount
    const previousWithdrawals = await Withdrawal.find({
      vendor: session.user.id,
      status: { $in: ['COMPLETED', 'PROCESSING', 'PENDING'] },
    }).lean();
    const alreadyWithdrawn = previousWithdrawals.reduce((sum, w) => sum + (w.netAmount || 0), 0);

    const availableBalance = netAmount - alreadyWithdrawn;

    if (availableBalance <= 0) {
      return NextResponse.json({
        message: 'No available balance for withdrawal.',
      }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));

    const withdrawal = await Withdrawal.create({
      vendor: session.user.id,
      amount: totalRevenue,
      commissionDeducted: Math.round(availableBalance * COMMISSION_PERCENT / (100 - COMMISSION_PERCENT)),
      netAmount: availableBalance,
      month: currentMonth,
      year: currentYear,
      vendorNotes: body.notes || '',
    });

    return NextResponse.json({
      id: withdrawal._id.toString(),
      netAmount: availableBalance,
      message: `Withdrawal of ₹${availableBalance.toLocaleString('en-IN')} requested successfully.`,
    }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Withdrawal already requested for this month.' }, { status: 409 });
    }
    console.error('[POST /api/vendor/withdrawals]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
