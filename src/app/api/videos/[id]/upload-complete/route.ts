import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { videoMetadataSchema } from '@/lib/validation';
import { exists } from '@/services/storage';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/services/audit';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const video = await db.video.findUnique({ where: { id } });
    if (!video) return apiError('VIDEO_NOT_FOUND');

    // Check ownership or admin
    if (user.role === 'CREATOR' && video.creatorId !== user.id) {
      return apiError('FORBIDDEN');
    }

    if (video.status !== 'UPLOADING') {
      return apiError('CONFLICT', 'Video is not in UPLOADING status');
    }

    const body = await request.json();
    const metadata = videoMetadataSchema.safeParse(body);
    if (!metadata.success) {
      return apiError('VALIDATION_ERROR', metadata.error.errors[0].message);
    }

    // Verify file exists (for local dev, skip strict check)
    if (video.storageBlobName) {
      const fileExists = await exists(video.storageBlobName);
      if (!fileExists) {
        return apiError('CONFLICT', 'Video file not found. Please upload the file first.');
      }
    }

    // Update video record
    const updated = await db.video.update({
      where: { id },
      data: {
        title: metadata.data.title,
        publisher: metadata.data.publisher,
        producer: metadata.data.producer,
        genre: metadata.data.genre,
        ageRating: metadata.data.ageRating,
        description: metadata.data.description ?? null,
        duration: body.duration ?? null,
        status: 'READY',
      },
      include: {
        creator: { select: { id: true, creatorName: true } },
      },
    });

    await createAuditLog(user.id, 'VIDEO_UPLOAD_COMPLETED', 'Video', id, { title: updated.title });
    logger.info('Upload completed', { videoId: id, userId: user.id });

    return apiSuccess({
      id: updated.id,
      title: updated.title,
      status: updated.status,
    });
  } catch (error) {
    logger.error('Upload complete failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
