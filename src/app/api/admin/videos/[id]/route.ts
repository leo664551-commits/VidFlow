import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiNoContent, apiError } from '@/lib/api-response';
import { deleteBlob } from '@/services/storage';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/services/audit';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const video = await db.video.findUnique({ where: { id } });
    if (!video) return apiError('VIDEO_NOT_FOUND');

    // Delete blob files
    if (video.storageBlobName) {
      await deleteBlob(video.storageBlobName);
    }
    if (video.thumbnailBlobName) {
      await deleteBlob(video.thumbnailBlobName);
    }

    await db.video.delete({ where: { id } });

    await createAuditLog(user.id, 'VIDEO_DELETED_ADMIN', 'Video', id, { title: video.title });
    logger.info('Video deleted by admin', { videoId: id, adminId: user.id });

    return apiNoContent();
  } catch (error) {
    logger.error('Admin delete video failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
