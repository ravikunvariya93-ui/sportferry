import { NextResponse } from 'next/server';
import { apiError, tooManyRequests, unauthorized, badRequest, serviceUnavailable } from '@/lib/apiResponse';
import { put } from '@vercel/blob';
import { auth, hasRole } from '@/lib/auth';
import { sharedRateLimit as rateLimit } from '@/lib/rateLimit';

const MAX_FILES = 6;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB per file

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !(await hasRole(session, 'VENDOR', 'ADMIN'))) {
      return unauthorized('Only vendors can upload images.');
    }

    const rl = await rateLimit(`upload:${session.user.id}`, { limit: 30, windowMs: 10 * 60 * 1000 });
    if (!rl.ok) {
      return tooManyRequests('Too many uploads. Please try again later.');
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return serviceUnavailable('Image uploads are not configured (missing BLOB_READ_WRITE_TOKEN).');
    }

    const formData = await request.formData();
    const files = formData.getAll('files').filter((f) => f && typeof f !== 'string');

    if (!files.length) {
      return badRequest('No files received.');
    }
    if (files.length > MAX_FILES) {
      return badRequest(`Upload up to ${MAX_FILES} images at a time.`);
    }

    const urls = [];
    for (const file of files) {
      if (!file.type?.startsWith('image/')) {
        return badRequest(`Not an image: ${file.name}`);
      }
      if (file.size > MAX_SIZE) {
        return badRequest(`${file.name} exceeds 5MB.`);
      }
      // Never trust the client filename — strip anything that isn't safe.
      const safeName = String(file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
      const blob = await put(`venues/${session.user.id}/${Date.now()}-${safeName}`, file, {
        access: 'public',
        addRandomSuffix: true,
      });
      urls.push(blob.url);
    }

    return NextResponse.json({ urls }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/upload', { message: 'Image upload failed. Please try again.' });
  }
}
