import { NextResponse } from 'next/server';

export const badRequest = (message = 'Bad request.') => NextResponse.json({ message }, { status: 400 });
export const unauthorized = (message = 'Unauthorized') => NextResponse.json({ message }, { status: 401 });
export const forbidden = (message = 'Forbidden') => NextResponse.json({ message }, { status: 403 });
export const notFound = (message = 'Not found.') => NextResponse.json({ message }, { status: 404 });
export const conflict = (message = 'Conflict.') => NextResponse.json({ message }, { status: 409 });

export function tooManyRequests(message, { retryAfterMs } = {}) {
  const headers = retryAfterMs ? { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } : undefined;
  return NextResponse.json({ message }, { status: 429, ...(headers ? { headers } : {}) });
}

export function apiError(error, label, { status = 500, message = 'Internal server error' } = {}) {
  console.error(`[${label}]`, error);
  return NextResponse.json({ message }, { status });
}
