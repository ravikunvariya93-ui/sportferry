import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { apiError } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';
import Withdrawal from '@/models/Withdrawal';
import { auth, hasRole } from '@/lib/auth';
import { parseListParams } from '@/lib/apiParams';

export async function GET(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { page, limit, skip, query } = parseListParams(request, { limit: 25, filters: ['status'] });

    await dbConnect();

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(query)
        .populate('vendor', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Withdrawal.countDocuments(query),
    ]);

    return NextResponse.json({
      withdrawals: withdrawals.map(w => ({
        id: w._id.toString(),
        vendorName: w.vendor?.name || 'Unknown',
        vendorId: w.vendor?._id?.toString() || null,
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
    return apiError(error, 'GET /api/admin/withdrawals');
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
    return apiError(error, 'PATCH /api/admin/withdrawals');
  }
}
