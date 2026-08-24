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
    const container = getContainer('comments');
    if (container) {
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: id }],
        })
        .fetchAll();
        
      const comment = resources[0];
      if (!comment) return apiError('COMMENT_NOT_FOUND');

      const body = await request.json();
      const newStatus = body.status;

      if (newStatus !== 'VISIBLE' && newStatus !== 'HIDDEN') {
        return apiError('VALIDATION_ERROR', 'Status must be VISIBLE or HIDDEN');
      }

      const item = container.item(id, comment.videoId);
      const { resource } = await item.read();
      await item.replace({ ...resource, status: newStatus, updatedAt: new Date().toISOString() });

      await createAuditLog(user.id, 'COMMENT_STATUS_CHANGED', 'Comment', id, {
        oldStatus: comment.status,
        newStatus,
      });
      logger.info('Comment status changed by admin', { commentId: id, newStatus, adminId: user.id });

      return apiSuccess({
        id: comment.id,
        status: newStatus,
      });
    } else {
      const comment = await db.comment.findUnique({ where: { id } });
      if (!comment) return apiError('COMMENT_NOT_FOUND');

      const body = await request.json();
      const newStatus = body.status;

      if (newStatus !== 'VISIBLE' && newStatus !== 'HIDDEN') {
        return apiError('VALIDATION_ERROR', 'Status must be VISIBLE or HIDDEN');
      }

      const updated = await db.comment.update({
        where: { id },
        data: { status: newStatus },
      });

      await createAuditLog(user.id, 'COMMENT_STATUS_CHANGED', 'Comment', id, {
        oldStatus: comment.status,
        newStatus,
      });
      logger.info('Comment status changed by admin', { commentId: id, newStatus, adminId: user.id });

      return apiSuccess({
        id: updated.id,
        status: updated.status,
      });
    }
  } catch (error) {
    logger.error('Update comment status failed', { error: (error as Error).message, commentId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
