import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/services/audit';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const container = getContainer('videos');
    if (container) {
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: id }],
        })
        .fetchAll();
        
      const video = resources[0];
      if (!video) return apiError('VIDEO_NOT_FOUND');

      const body = await request.json();
      const newStatus = body.status;

      const validStatuses = ['READY', 'UNPUBLISHED', 'FAILED', 'PROCESSING'];
      if (!validStatuses.includes(newStatus)) {
        return apiError('VALIDATION_ERROR', 'Invalid status');
      }

      const item = container.item(id, video.genre);
      const { resource } = await item.read();
      await item.replace({ ...resource, status: newStatus, updatedAt: new Date().toISOString() });

      await createAuditLog(user.id, 'VIDEO_STATUS_CHANGED', 'Video', id, {
        oldStatus: video.status,
        newStatus,
      });
      logger.info('Video status changed by admin', { videoId: id, newStatus, adminId: user.id });

      return apiSuccess({
        id: video.id,
        title: video.title,
        status: newStatus,
      });
    } else {
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
    }
  } catch (error) {
    logger.error('Update video status failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
