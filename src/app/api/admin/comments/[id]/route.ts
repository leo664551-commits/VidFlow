import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiNoContent, apiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/services/audit';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const container = getContainer('comments');
    if (container) {
      // Find comment first to get partition key
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: id }],
        })
        .fetchAll();
        
      const comment = resources[0];
      if (!comment) return apiError('COMMENT_NOT_FOUND');

      await container.item(id, comment.videoId).delete();

      await createAuditLog(user.id, 'COMMENT_DELETED_ADMIN', 'Comment', id, {
        videoId: comment.videoId,
      });
      logger.info('Comment deleted by admin', { commentId: id, adminId: user.id });

      return apiNoContent();
    } else {
      const comment = await db.comment.findUnique({ where: { id } });
      if (!comment) return apiError('COMMENT_NOT_FOUND');

      await db.comment.delete({ where: { id } });

      await createAuditLog(user.id, 'COMMENT_DELETED_ADMIN', 'Comment', id, {
        videoId: comment.videoId,
      });
      logger.info('Comment deleted by admin', { commentId: id, adminId: user.id });

      return apiNoContent();
    }
  } catch (error) {
    logger.error('Admin delete comment failed', { error: (error as Error).message, commentId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
