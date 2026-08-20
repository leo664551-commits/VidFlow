import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { pinCommentSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const video = await db.video.findUnique({
      where: { id },
      select: { id: true, creatorId: true },
    });
    if (!video) return apiError('VIDEO_NOT_FOUND');

    // Only the video's creator or an admin can pin
    if (user.role === 'CREATOR' && video.creatorId !== user.id) {
      return apiError('FORBIDDEN');
    }

    const body = await request.json();
    const parsed = pinCommentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
    }

    const commentId = parsed.data.commentId ?? null;

    // If pinning (not unpinning), validate the comment belongs to this video
    if (commentId) {
      const comment = await db.comment.findUnique({
        where: { id: commentId },
        select: { id: true, videoId: true },
      });
      if (!comment || comment.videoId !== id) {
        return apiError('VALIDATION_ERROR', 'Comment not found or does not belong to this video.');
      }
    }

    const updated = await db.video.update({
      where: { id },
      data: { pinnedCommentId: commentId },
      select: { pinnedCommentId: true },
    });

    return apiSuccess({ pinnedCommentId: updated.pinnedCommentId });
  } catch (error) {
    logger.error('Pin comment failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
