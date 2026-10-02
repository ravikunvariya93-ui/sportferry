import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { auth } from '@/lib/auth';

const MAX_FILES = 6;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB per file

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !['VENDOR', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Only vendors can upload images.' }, { status: 401 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { message: 'Image uploads are not configured (missing BLOB_READ_WRITE_TOKEN).' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files').filter((f) => f && typeof f !== 'string');

    if (!files.length) {
      return NextResponse.json({ message: 'No files received.' }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ message: `Upload up to ${MAX_FILES} images at a time.` }, { status: 400 });
    }

    const urls = [];
    for (const file of files) {
      if (!file.type?.startsWith('image/')) {
        return NextResponse.json({ message: `Not an image: ${file.name}` }, { status: 400 });
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ message: `${file.name} exceeds 5MB.` }, { status: 400 });
      }
      const blob = await put(`venues/${session.user.id}/${Date.now()}-${file.name}`, file, {
        access: 'public',
        addRandomSuffix: true,
      });
      urls.push(blob.url);
    }

    return NextResponse.json({ urls }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/upload]', error);
    return NextResponse.json({ message: 'Image upload failed. Please try again.' }, { status: 500 });
  }
}
