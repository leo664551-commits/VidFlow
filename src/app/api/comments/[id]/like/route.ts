import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { createNotification } from '@/services/notification';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CONSUMER' && user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    // Check comment exists
    const comment = await db.comment.findUnique({
      where: { id },
      select: { id: true, userId: true, content: true, status: true },
    });
    if (!comment) return apiError('COMMENT_NOT_FOUND');

    const existing = await db.commentLike.findUnique({
      where: { commentId_userId: { commentId: id, userId: user.id } },
    });

    if (existing) {
      // Unlike
      await db.commentLike.delete({ where: { id: existing.id } });
      const likeCount = await db.commentLike.count({ where: { commentId: id } });
      return apiSuccess({ liked: false, likeCount });
    } else {
      // Like
      await db.commentLike.create({
        data: { commentId: id, userId: user.id },
      });
      const likeCount = await db.commentLike.count({ where: { commentId: id } });

      // Notify comment author if different from liker
      if (comment.userId !== user.id) {
        const actorName = user.displayName || user.username || 'Someone';
        const snippet = comment.content.length > 30 ? `${comment.content.slice(0, 30)}...` : comment.content;
        await createNotification({
          userId: comment.userId,
          actorId: user.id,
          type: 'LIKE_COMMENT',
          title: 'New Like on Comment',
          message: `${actorName} liked your comment: "${snippet}"`,
          entityType: 'Comment',
          entityId: comment.id,
        });
      }

      return apiSuccess({ liked: true, likeCount });
    }
  } catch (error) {
    logger.error('Toggle comment like failed', { error: (error as Error).message, commentId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
