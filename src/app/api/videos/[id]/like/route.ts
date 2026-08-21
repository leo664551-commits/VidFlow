import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { createNotification } from '@/services/notification';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CONSUMER' && user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const video = await db.video.findUnique({
      where: { id },
      select: { id: true, creatorId: true, title: true, status: true },
    });
    if (!video) return apiError('VIDEO_NOT_FOUND');
    if (video.status !== 'READY') return apiError('VIDEO_NOT_FOUND');

    const existing = await db.videoLike.findUnique({
      where: { videoId_userId: { videoId: id, userId: user.id } },
    });

    if (existing) {
      // Unlike
      await db.videoLike.delete({ where: { id: existing.id } });
      const likeCount = await db.videoLike.count({ where: { videoId: id } });
      return apiSuccess({ liked: false, likeCount });
    } else {
      // Like
      await db.videoLike.create({
        data: { videoId: id, userId: user.id },
      });
      const likeCount = await db.videoLike.count({ where: { videoId: id } });

      // Notify video creator if different from liker
      if (video.creatorId !== user.id) {
        const actorName = user.displayName || user.username || 'Someone';
        await createNotification({
          userId: video.creatorId,
          actorId: user.id,
          type: 'LIKE_VIDEO',
          title: 'New Like on Video',
          message: `${actorName} liked your video "${video.title}"`,
          entityType: 'Video',
          entityId: video.id,
        });
      }

      return apiSuccess({ liked: true, likeCount });
    }
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CONSUMER' && user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const video = await db.video.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!video) return apiError('VIDEO_NOT_FOUND');

    const [existing, likeCount] = await Promise.all([
      db.videoLike.findUnique({
        where: { videoId_userId: { videoId: id, userId: user.id } },
      }),
      db.videoLike.count({ where: { videoId: id } }),
    ]);

    return apiSuccess({ liked: !!existing, likeCount });
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
