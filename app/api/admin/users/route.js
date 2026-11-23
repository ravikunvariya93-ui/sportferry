import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Booking from '@/models/Booking';
import { auth, hasRole } from '@/lib/auth';

async function requireAdmin() {
  const session = await auth();
  if (!session || !(await hasRole(session, 'ADMIN'))) return null;
  return session;
}

export async function GET(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    let limit = parseInt(searchParams.get('limit') || '20');
    if (limit > 100) limit = 100;
    if (limit < 1) limit = 1;
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
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
        .skip((page - 1) * limit)
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
    console.error('[GET /api/admin/users]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const username = String(body.username || email).trim();
    const role = ['PLAYER', 'VENDOR', 'ADMIN'].includes(body.role) ? body.role : 'PLAYER';
    if (!name || !email || !username) {
      return NextResponse.json({ message: 'Name, email and username are required.' }, { status: 400 });
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
    if (error?.code === 11000) return NextResponse.json({ message: 'Username or email already exists.' }, { status: 409 });
    console.error('[POST /api/admin/users]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { userId, role, blocked } = await request.json();
    if (!userId) return NextResponse.json({ message: 'userId is required' }, { status: 400 });

    const update = {};
    if (role !== undefined) {
      if (!['PLAYER', 'VENDOR', 'ADMIN'].includes(role)) {
        return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
      }
      if (userId === session.user.id) {
        return NextResponse.json({ message: 'You cannot change your own role.' }, { status: 400 });
      }
      update.role = role;
    }
    if (blocked !== undefined) {
      if (userId === session.user.id) {
        return NextResponse.json({ message: 'You cannot block your own account.' }, { status: 400 });
      }
      update.blocked = Boolean(blocked);
    }
    if (!Object.keys(update).length) {
      return NextResponse.json({ message: 'Nothing to update.' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).select('-password');
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    return NextResponse.json({ id: user._id.toString(), role: user.role, blocked: Boolean(user.blocked) });
  } catch (error) {
    console.error('[PATCH /api/admin/users]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ message: 'userId is required' }, { status: 400 });

    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json({ message: 'Cannot delete your own account' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findByIdAndDelete(userId);
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/admin/users]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
