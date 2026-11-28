import { NextResponse } from 'next/server';
import { tooManyRequests, badRequest, conflict } from '@/lib/apiResponse';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { isValidUsername, isValidPassword, NAME_MAX, PASSWORD_MIN } from '@/lib/validation';
import { sharedRateLimit as rateLimit, clientIp } from '@/lib/rateLimit';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(request) {
  try {
    const rl = await rateLimit(`register:${clientIp(request)}`, { limit: 10, windowMs: 15 * 60 * 1000 });
    if (!rl.ok) {
      return tooManyRequests('Too many sign-up attempts. Please try again later.');
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role = body.role;

    if (!name || !username || !email || !password) {
      return badRequest('Missing fields');
    }
    if (name.length > NAME_MAX) {
      return badRequest(`Name must be at most ${NAME_MAX} characters.`);
    }
    if (!isValidUsername(username)) {
      return NextResponse.json(
        { message: 'Username must be 3-32 characters (letters, numbers, dot, underscore, hyphen).' },
        { status: 400 }
      );
    }
    if (!isValidPassword(password)) {
      return badRequest(`Password must be at least ${PASSWORD_MIN} characters.`);
    }
    if (!EMAIL_RE.test(email)) {
      return badRequest('Invalid email address.');
    }

    await dbConnect();

    // Check if user exists (by email OR username)
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      const field = existingUser.username === username ? 'Username' : 'Email';
      return conflict(`${field} already exists`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Self-service signup may choose Player (PLAYER) or Ground Owner (VENDOR),
    // but can never grant itself ADMIN — admins are provisioned separately.
    const assignedRole = role === 'VENDOR' ? 'VENDOR' : 'PLAYER';

    // Create user
    const user = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      role: assignedRole,
    });

    return NextResponse.json(
      { message: 'User created successfully', userId: user._id },
      { status: 201 }
    );
  } catch (error) {
    // Two simultaneous sign-ups with the same username/email both pass the
    // check above — the unique index is what actually stops the second one.
    if (error?.code === 11000) {
      const field = error.keyPattern?.email ? 'Email' : 'Username';
      return conflict(`${field} already exists`);
    }
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
