import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { isValidUsername, isValidPassword, NAME_MAX, PASSWORD_MIN } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rateLimit';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(request) {
  try {
    const rl = rateLimit(`register:${clientIp(request)}`, { limit: 10, windowMs: 15 * 60 * 1000 });
    if (!rl.ok) {
      return NextResponse.json({ message: 'Too many sign-up attempts. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role = body.role;

    if (!name || !username || !email || !password) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }
    if (name.length > NAME_MAX) {
      return NextResponse.json({ message: `Name must be at most ${NAME_MAX} characters.` }, { status: 400 });
    }
    if (!isValidUsername(username)) {
      return NextResponse.json(
        { message: 'Username must be 3-32 characters (letters, numbers, dot, underscore, hyphen).' },
        { status: 400 }
      );
    }
    if (!isValidPassword(password)) {
      return NextResponse.json({ message: `Password must be at least ${PASSWORD_MIN} characters.` }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ message: 'Invalid email address.' }, { status: 400 });
    }

    await dbConnect();

    // Check if user exists (by email OR username)
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      const field = existingUser.username === username ? 'Username' : 'Email';
      return NextResponse.json({ message: `${field} already exists` }, { status: 409 });
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
      return NextResponse.json({ message: `${field} already exists` }, { status: 409 });
    }
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
