import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import fs from 'fs/promises';
import path from 'path';

const AVATAR_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');

async function ensureAvatarDir() {
  await fs.mkdir(AVATAR_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED', 'Please log in to upload an avatar');

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('VALIDATION_ERROR', 'No image file provided');
    }

    // Validate MIME type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.type)) {
      return apiError('INVALID_FILE_TYPE', 'Only JPG, PNG, WebP, and GIF images are allowed');
    }

    // Validate size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return apiError('FILE_TOO_LARGE', 'Image size must be less than 5MB');
    }

    await ensureAvatarDir();

    // Generate safe filename
    const ext = path.extname(file.name).toLowerCase() || (file.type === 'image/png' ? '.png' : '.jpg');
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    const filename = `${user.id}-${Date.now()}${safeExt}`;
    const filePath = path.join(AVATAR_DIR, filename);

    // Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;

    // Update user in database
    await db.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    });

    return apiSuccess({
      avatarUrl,
      message: 'Avatar uploaded successfully',
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return apiError('INTERNAL_SERVER_ERROR', 'Failed to upload avatar');
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  try {
    await db.user.update({
      where: { id: user.id },
      data: { avatarUrl: null },
    });

    return apiSuccess({
      avatarUrl: null,
      message: 'Avatar removed',
    });
  } catch (error) {
    console.error('Avatar delete error:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
