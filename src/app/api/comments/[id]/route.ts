import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiNoContent, apiError } from '@/lib/api-response';
import { commentSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  const { id } = await params;

  try {
    const comment = await db.comment.findUnique({ where: { id } });
    if (!comment) return apiError('COMMENT_NOT_FOUND');

    // Only own comment or admin
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
    const comment = await db.comment.findUnique({ where: { id } });
    if (!comment) return apiError('COMMENT_NOT_FOUND');

    // Only own comment or admin
    if (user.role !== 'ADMIN' && comment.userId !== user.id) {
      return apiError('FORBIDDEN');
    }

    await db.comment.delete({ where: { id } });

    return apiNoContent();
  } catch (error) {
    logger.error('Delete comment failed', { error: (error as Error).message, commentId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
