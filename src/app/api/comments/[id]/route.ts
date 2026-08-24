import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiNoContent, apiError } from '@/lib/api-response';
import { commentSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  const { id } = await params;

  try {
    const container = getContainer('comments');
    if (container) {
      const { resources: comments } = await container.items
        .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();
      const comment = comments[0];
      if (!comment) return apiError('COMMENT_NOT_FOUND');

      if (user.role !== 'ADMIN' && comment.userId !== user.id) {
        return apiError('FORBIDDEN');
      }

      const body = await request.json();
      const parsed = commentSchema.safeParse(body);
      if (!parsed.success) {
        return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
      }

      const updatedData = {
        ...comment,
        content: parsed.data.content,
        updatedAt: new Date().toISOString()
      };

      await container.item(comment.id, comment.videoId).replace(updatedData);

      return apiSuccess({
        id: updatedData.id,
        content: updatedData.content,
        status: updatedData.status,
        createdAt: updatedData.createdAt,
        updatedAt: updatedData.updatedAt,
        user: updatedData.user,
      });

    } else {
      const comment = await db.comment.findUnique({ where: { id } });
      if (!comment) return apiError('COMMENT_NOT_FOUND');

      if (user.role !== 'ADMIN' && comment.userId !== user.id) {
        return apiError('FORBIDDEN');
      }

      const body = await request.json();
      const parsed = commentSchema.safeParse(body);
      if (!parsed.success) {
        return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
      }

      const updated = await db.comment.update({
        where: { id },
        data: { content: parsed.data.content },
        include: { user: { select: { id: true, displayName: true } } },
      });

      return apiSuccess({
        id: updated.id,
        content: updated.content,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        user: updated.user,
      });
    }
  } catch (error) {
    logger.error('Update comment failed', { error: (error as Error).message, commentId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  const { id } = await params;

  try {
    const container = getContainer('comments');
    if (container) {
      const { resources: comments } = await container.items
        .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();
      const comment = comments[0];
      if (!comment) return apiError('COMMENT_NOT_FOUND');

      if (user.role !== 'ADMIN' && comment.userId !== user.id) {
        return apiError('FORBIDDEN');
      }

      await container.item(comment.id, comment.videoId).delete();

      return apiNoContent();

    } else {
      const comment = await db.comment.findUnique({ where: { id } });
      if (!comment) return apiError('COMMENT_NOT_FOUND');

      if (user.role !== 'ADMIN' && comment.userId !== user.id) {
        return apiError('FORBIDDEN');
      }

      await db.comment.delete({ where: { id } });

      return apiNoContent();
    }
  } catch (error) {
    logger.error('Delete comment failed', { error: (error as Error).message, commentId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
