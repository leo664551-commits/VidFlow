import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/services/audit';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const video = await db.video.findUnique({ where: { id } });
    if (!video) return apiError('VIDEO_NOT_FOUND');

    const body = await request.json();
    const newStatus = body.status;

    const validStatuses = ['READY', 'UNPUBLISHED', 'FAILED', 'PROCESSING'];
    if (!validStatuses.includes(newStatus)) {
      return apiError('VALIDATION_ERROR', 'Invalid status');
    }

    const updated = await db.video.update({
      where: { id },
      data: { status: newStatus },
    });

    await createAuditLog(user.id, 'VIDEO_STATUS_CHANGED', 'Video', id, {
      oldStatus: video.status,
      newStatus,
    });
    logger.info('Video status changed by admin', { videoId: id, newStatus, adminId: user.id });

    return apiSuccess({
      id: updated.id,
      title: updated.title,
      status: updated.status,
    });
  } catch (error) {
    logger.error('Update video status failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
