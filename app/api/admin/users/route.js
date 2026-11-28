import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiGuards';
import { apiError, forbidden, badRequest, conflict, notFound } from '@/lib/apiResponse';
import { parseListParams } from '@/lib/apiParams';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Booking from '@/models/Booking';
import { escapeRegex } from '@/lib/validation';

export async function GET(request) {
  try {
    const session = await requireAdmin();
    if (!session) return forbidden();

    const { page, limit, skip, searchParams } = parseListParams(request);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || ''; // 'active' | 'blocked'

    await dbConnect();

    const baseQuery = {};
    if (role) baseQuery.role = role;
    if (status === 'blocked') baseQuery.blocked = true;
    else if (status === 'active') baseQuery.blocked = { $ne: true };

    const query = { ...baseQuery };
    if (search) {
      const escaped = escapeRegex(search);
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // Games played + total spend, from confirmed bookings.
    const ids = users.map(u => u._id);
    const agg = await Booking.aggregate([
      { $match: { user: { $in: ids }, status: 'CONFIRMED' } },
      { $group: { _id: '$user', games: { $sum: 1 }, spend: { $sum: '$totalAmount' } } },
    ]);
    const statMap = {};
    agg.forEach(r => { statMap[r._id.toString()] = { games: r.games, spend: r.spend }; });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone || '',
        city: u.city || '',
        blocked: Boolean(u.blocked),
        gamesPlayed: statMap[u._id.toString()]?.games || 0,
        totalSpend: statMap[u._id.toString()]?.spend || 0,
        createdAt: u.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return apiError(error, 'GET /api/admin/users');
  }
}

export async function POST(request) {
  try {
    const session = await requireAdmin();
    if (!session) return forbidden();
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const username = String(body.username || email).trim();
    const role = ['PLAYER', 'VENDOR', 'ADMIN'].includes(body.role) ? body.role : 'PLAYER';
    if (!name || !email || !username) {
      return badRequest('Name, email and username are required.');
    }
    await dbConnect();
    const bcrypt = (await import('bcryptjs')).default;
    const user = await User.create({
      name, email, username, role,
      password: body.password ? await bcrypt.hash(String(body.password), 10) : '',
      phone: String(body.phone || '').trim(),
      city: String(body.city || '').trim(),
    });
    return NextResponse.json({ id: user._id.toString(), role: user.role }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) return conflict('Username or email already exists.');
    return apiError(error, 'POST /api/admin/users');
  }
}

export async function PATCH(request) {
  try {
    const session = await requireAdmin();
    if (!session) return forbidden();

    const { userId, role, blocked } = await request.json();
    if (!userId) return badRequest('userId is required');

    const update = {};
    if (role !== undefined) {
      if (!['PLAYER', 'VENDOR', 'ADMIN'].includes(role)) {
        return badRequest('Invalid role');
      }
      if (userId === session.user.id) {
        return badRequest('You cannot change your own role.');
      }
      update.role = role;
    }
    if (blocked !== undefined) {
      if (userId === session.user.id) {
        return badRequest('You cannot block your own account.');
      }
      update.blocked = Boolean(blocked);
    }
    if (!Object.keys(update).length) {
      return badRequest('Nothing to update.');
    }

    await dbConnect();
    const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).select('-password');
    if (!user) return notFound('User not found');

    return NextResponse.json({ id: user._id.toString(), role: user.role, blocked: Boolean(user.blocked) });
  } catch (error) {
    return apiError(error, 'PATCH /api/admin/users');
  }
}

export async function DELETE(request) {
  try {
    const session = await requireAdmin();
    if (!session) return forbidden();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return badRequest('userId is required');

    // Prevent self-deletion
    if (userId === session.user.id) {
      return badRequest('Cannot delete your own account');
    }

    await dbConnect();
    const user = await User.findByIdAndDelete(userId);
    if (!user) return notFound('User not found');

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    return apiError(error, 'DELETE /api/admin/users');
  }
}
