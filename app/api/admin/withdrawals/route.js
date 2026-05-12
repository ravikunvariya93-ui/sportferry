import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Withdrawal from '@/models/Withdrawal';
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
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);

    await dbConnect();

    const query = {};
    if (status) query.status = status;

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(query)
        .populate('vendor', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Withdrawal.countDocuments(query),
    ]);

    return NextResponse.json({
      withdrawals: withdrawals.map(w => ({
        id: w._id.toString(),
        vendorName: w.vendor?.name || 'Unknown',
        vendorEmail: w.vendor?.email || '',
        amount: w.amount,
        commissionDeducted: w.commissionDeducted,
        netAmount: w.netAmount,
        status: w.status,
        month: w.month,
        year: w.year,
        requestedAt: w.requestedAt,
        processedAt: w.processedAt,
        adminNotes: w.adminNotes,
        vendorNotes: w.vendorNotes,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[GET /api/admin/withdrawals]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { withdrawalId, status, adminNotes } = await request.json();
    if (!withdrawalId || !status) {
      return NextResponse.json({ message: 'withdrawalId and status are required' }, { status: 400 });
    }
    if (!['PROCESSING', 'COMPLETED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    await dbConnect();

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    withdrawal.status = status;
    if (adminNotes) withdrawal.adminNotes = adminNotes;
    if (status === 'COMPLETED' || status === 'REJECTED') {
      withdrawal.processedAt = new Date();
    }

    await withdrawal.save();

    return NextResponse.json({ id: withdrawal._id.toString(), status: withdrawal.status });
  } catch (error) {
    console.error('[PATCH /api/admin/withdrawals]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
