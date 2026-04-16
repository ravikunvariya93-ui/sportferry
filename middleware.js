import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Root path redirection
  if (pathname === '/') {
    if (session?.user?.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    if (session?.user?.role === 'VENDOR') {
      return NextResponse.redirect(new URL('/vendor', req.url));
    }
  }

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    if (!session || session.user?.role !== 'ADMIN') {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Vendor route protection
  if (pathname.startsWith('/vendor')) {
    if (!session || session.user?.role !== 'VENDOR') {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/', '/vendor/:path*', '/admin/:path*'],
};

