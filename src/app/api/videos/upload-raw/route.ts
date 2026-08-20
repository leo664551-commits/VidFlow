import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { saveFile } from '@/services/storage';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  const blobName = new URL(request.url).searchParams.get('blobName');
  if (!blobName) {
    return apiError('VALIDATION_ERROR', 'blobName query parameter is required');
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('VALIDATION_ERROR', 'No file provided');
    }

    // Validate file type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['mp4', 'webm'];
    if (!ext || !allowedExts.includes(ext.replace('.', ''))) {
      return apiError('INVALID_FILE_TYPE');
    }

    // Validate MIME type
    const allowedMimes = ['video/mp4', 'video/webm'];
    if (!allowedMimes.includes(file.type)) {
      return apiError('INVALID_FILE_TYPE');
    }

    // Validate file size (500MB max)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return apiError('FILE_TOO_LARGE');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await saveFile(blobName, buffer);

    logger.info('File uploaded', { blobName, userId: user.id, size: file.size });

    return apiSuccess({ blobName });
  } catch (error) {
    logger.error('Upload failed', { error: (error as Error).message, blobName });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
