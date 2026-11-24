import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import User from '@/models/User';
import Withdrawal from '@/models/Withdrawal';
import PayoutBatch from '@/models/PayoutBatch';
import { auth, hasRole } from '@/lib/auth';
import { COMMISSION_PERCENT } from '@/lib/constants';
import { computeVendorPayables, settledAmountForVendor } from '@/lib/payouts';
import { releaseExpiredPendingBookings } from '@/lib/booking-utils';

async function requireAdmin() {
  const session = await auth();
  if (!session || !(await hasRole(session, 'ADMIN'))) return null;
  return session;
}

/** Per-vendor pending payables from confirmed online bookings minus settled amounts. */
async function pendingPayables() {
  const bookings = await Booking.find({ status: 'CONFIRMED', bookingType: 'ONLINE' })
    .populate('venue', 'name owner')
    .select('venue totalAmount')
    .lean();

  const [batches, withdrawals, users] = await Promise.all([
    PayoutBatch.find({}).select('vendor net settledAmount status').lean(),
    Withdrawal.find({}).select('vendor netAmount status').lean(),
    User.find({ role: 'VENDOR' }).select('name email bankDetails').lean(),
  ]);

  const settledByVendor = {};
  const vendorIds = new Set([
    ...batches.map(b => b.vendor?.toString()),
    ...withdrawals.map(w => w.vendor?.toString()),
  ]);
  for (const vendorId of vendorIds) {
    if (!vendorId) continue;
    settledByVendor[vendorId] = settledAmountForVendor({
      batches: batches.filter(b => b.vendor?.toString() === vendorId),
      withdrawals: withdrawals.filter(w => w.vendor?.toString() === vendorId),
    });
  }

  const userMap = {};
  users.forEach(u => { userMap[u._id.toString()] = u; });

  const rows = computeVendorPayables({
    bookings: bookings.map(b => ({ vendorId: b.venue?.owner ? String(b.venue.owner) : null, totalAmount: b.totalAmount })),
    settledByVendor,
    commissionPercent: COMMISSION_PERCENT,
  }).map(r => {
    const u = userMap[r.vendorId];
    const bank = u?.bankDetails || {};
    return {
      vendorId: r.vendorId,
      vendorName: u?.name || 'Unknown vendor',
      vendorEmail: u?.email || '',
      venueName: bookings.find(b => b.venue?.owner && String(b.venue.owner) === r.vendorId)?.venue?.name || '',
      bookings: r.bookings,
      gross: r.gross,
      commission: r.commission,
      net: r.net,
      payable: r.payable,
      bank: {
        accountNumber: bank.accountNumber ? `****${String(bank.accountNumber).slice(-4)}` : '',
        bankName: bank.bankName || '',
      },
      status: r.payable > 0 ? 'PENDING' : 'COMPLETED',
    };
  }).filter(r => r.bookings > 0);

  return rows;
}

export async function GET(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const format = new URL(request.url).searchParams.get('format');
    await dbConnect();
    await releaseExpiredPendingBookings();

    const [rows, batches] = await Promise.all([
      pendingPayables(),
      PayoutBatch.find({}).populate('vendor', 'name email').sort({ createdAt: -1 }).limit(100).lean(),
    ]);

    if (format === 'csv') {
      const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const lines = ['Vendor,Bank,Bank Account,Bookings,Gross,Commission,Payable,Status',
        ...rows.map(r => [r.vendorName, r.bank?.bankName, r.bank?.accountNumber, r.bookings, r.gross, r.commission, r.payable, r.status].map(cell).join(','))];
      return new NextResponse(lines.join('\n'), {
        status: 200,
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="settlement-report.csv"' },
      });
    }

    const pending = rows.filter(r => r.payable > 0);
    const kpis = {
      gross: rows.reduce((s, r) => s + r.gross, 0),
      commission: rows.reduce((s, r) => s + r.commission, 0),
      payable: rows.reduce((s, r) => s + r.payable, 0),
      pendingCount: pending.length,
      commissionPercent: COMMISSION_PERCENT,
    };

    return NextResponse.json({
      kpis,
      vendors: rows,
      batches: batches.map(b => ({
        id: b._id.toString(),
        vendorName: b.vendor?.name || 'Unknown',
        vendorId: b.vendor?._id?.toString() || null,
        bookingsCount: b.bookingsCount,
        gross: b.gross,
        commission: b.commission,
        net: b.net,
        settledAmount: b.settledAmount ?? b.net,
        status: b.status,
        method: b.method,
        reference: b.reference || '',
        periodStart: b.periodStart,
        periodEnd: b.periodEnd,
        processedAt: b.processedAt,
      })),
    });
  } catch (error) {
    console.error('[GET /api/admin/payouts]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { vendorIds, method = 'AUTOMATED', reference = '' } = await request.json();
    if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
      return NextResponse.json({ message: 'Select at least one vendor.' }, { status: 400 });
    }
    if (method === 'MANUAL' && !String(reference).trim()) {
      return NextResponse.json({ message: 'A reference number is required for a manual transfer.' }, { status: 400 });
    }

    await dbConnect();
    const rows = await pendingPayables();
    const selected = rows.filter(r => vendorIds.includes(r.vendorId) && r.payable > 0);
    if (!selected.length) return NextResponse.json({ message: 'Nothing payable for the selected vendors.' }, { status: 400 });

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 30);

    const users = await User.find({ _id: { $in: selected.map(s => s.vendorId) } }).select('bankDetails').lean();
    const bankMap = {};
    users.forEach(u => { bankMap[u._id.toString()] = u.bankDetails || {}; });

    const docs = selected.map(s => ({
      vendor: s.vendorId,
      periodStart,
      periodEnd: now,
      bookingsCount: s.bookings,
      gross: s.gross,
      commission: s.commission,
      net: s.net,
      // This batch settles the outstanding payable, which may be less than the
      // period net when earnings were already partly paid out.
      settledAmount: s.payable,
      bankAccountSnapshot: bankMap[s.vendorId] || {},
      // AUTOMATED records the settlement as in-flight (the bank transfer happens
      // out of band); MANUAL with a reference is marked paid immediately.
      status: method === 'MANUAL' ? 'COMPLETED' : 'PROCESSING',
      method,
      reference: String(reference).trim(),
      createdBy: session.user.id,
      processedAt: method === 'MANUAL' ? now : undefined,
    }));

    const created = await PayoutBatch.insertMany(docs);
    return NextResponse.json({
      created: created.length,
      total: selected.reduce((sum, r) => sum + r.payable, 0),
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/payouts]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { batchId, status, reference } = await request.json();
    if (!batchId || !['COMPLETED', 'FAILED'].includes(status)) {
      return NextResponse.json({ message: 'batchId and a valid status are required.' }, { status: 400 });
    }

    await dbConnect();
    const update = { status };
    if (status === 'COMPLETED') update.processedAt = new Date();
    if (reference !== undefined) update.reference = String(reference).trim();

    const batch = await PayoutBatch.findByIdAndUpdate(batchId, { $set: update }, { new: true });
    if (!batch) return NextResponse.json({ message: 'Payout not found.' }, { status: 404 });

    return NextResponse.json({ id: batch._id.toString(), status: batch.status });
  } catch (error) {
    console.error('[PATCH /api/admin/payouts]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
