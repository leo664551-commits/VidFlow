import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { createNotification } from '@/services/notification';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CONSUMER' && user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const commentContainer = getContainer('comments');
    const likeContainer = getContainer('commentLikes');

    if (commentContainer && likeContainer) {
      const { resources: comments } = await commentContainer.items
        .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();
      const comment = comments[0];
      if (!comment) return apiError('COMMENT_NOT_FOUND');

      const { resources: existingLikes } = await likeContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.commentId = @cid AND c.userId = @uid',
          parameters: [
            { name: '@cid', value: id },
            { name: '@uid', value: user.id }
          ]
        })
        .fetchAll();
      const existing = existingLikes[0];

      if (existing) {
        await likeContainer.item(existing.id, id).delete();
        
        const { resources: countRes } = await likeContainer.items.query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.commentId = @cid',
          parameters: [{ name: '@cid', value: id }]
        }).fetchAll();
        return apiSuccess({ liked: false, likeCount: countRes[0] || 0 });
      } else {
        await likeContainer.items.create({
          id: uuidv4(),
          commentId: id,
          userId: user.id,
          createdAt: new Date().toISOString()
        });

        const { resources: countRes } = await likeContainer.items.query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.commentId = @cid',
          parameters: [{ name: '@cid', value: id }]
        }).fetchAll();
        const likeCount = countRes[0] || 0;

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

    } else {
      const comment = await db.comment.findUnique({
        where: { id },
        select: { id: true, userId: true, content: true, status: true },
      });
      if (!comment) return apiError('COMMENT_NOT_FOUND');

      const existing = await db.commentLike.findUnique({
        where: { commentId_userId: { commentId: id, userId: user.id } },
      });

      if (existing) {
        await db.commentLike.delete({ where: { id: existing.id } });
        const likeCount = await db.commentLike.count({ where: { commentId: id } });
        return apiSuccess({ liked: false, likeCount });
      } else {
        await db.commentLike.create({
          data: { commentId: id, userId: user.id },
        });
        const likeCount = await db.commentLike.count({ where: { commentId: id } });

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
    }
  } catch (error) {
    logger.error('Toggle comment like failed', { error: (error as Error).message, commentId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
