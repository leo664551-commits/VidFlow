import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiError } from '@/lib/api-response';
import { createNotification } from '@/services/notification';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CONSUMER' && user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const videoContainer = getContainer('videos');
    const likeContainer = getContainer('videoLikes');

    if (videoContainer && likeContainer) {
      const { resources: videos } = await videoContainer.items
        .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();
      const video = videos[0];

      if (!video || video.status !== 'READY') return apiError('VIDEO_NOT_FOUND');

      const { resources: likes } = await likeContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.videoId = @videoId AND c.userId = @userId',
          parameters: [
            { name: '@videoId', value: id },
            { name: '@userId', value: user.id }
          ]
        })
        .fetchAll();
      const existing = likes[0];

      let liked: boolean;
      if (existing) {
        await likeContainer.item(existing.id, id).delete();
        liked = false;
      } else {
        await likeContainer.items.create({
          id: uuidv4(),
          videoId: id,
          userId: user.id,
          createdAt: new Date().toISOString()
        });
        liked = true;

        if (video.creatorId !== user.id) {
          const actorName = user.displayName || user.username || 'Someone';
          createNotification({
            userId: video.creatorId,
            actorId: user.id,
            type: 'LIKE_VIDEO',
            title: 'New Like on Video',
            message: `${actorName} liked your video "${video.title}"`,
            entityType: 'Video',
            entityId: video.id,
          }).catch((err) => console.warn('Failed to send like notification:', err));
        }
      }

      const { resources: countResult } = await likeContainer.items
        .query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.videoId = @videoId',
          parameters: [{ name: '@videoId', value: id }]
        })
        .fetchAll();
      const likeCount = countResult[0] || 0;

      // Persist the updated likeCount onto the video document in Cosmos DB
      try {
        const item = videoContainer.item(video.id, video.genre);
        await item.replace({ ...video, likeCount, updatedAt: new Date().toISOString() });
      } catch (err) {
        console.warn('Failed to update likeCount on video item in Cosmos DB:', err);
      }

      return apiSuccess({ liked, likeCount });
    } else {
      const [video, existing] = await Promise.all([
        db.video.findUnique({
          where: { id },
          select: { id: true, creatorId: true, title: true, status: true },
        }),
        db.videoLike.findUnique({
          where: { videoId_userId: { videoId: id, userId: user.id } },
          select: { id: true },
        }),
      ]);

      if (!video || video.status !== 'READY') return apiError('VIDEO_NOT_FOUND');

      let liked: boolean;
      if (existing) {
        await db.videoLike.delete({ where: { id: existing.id } });
        liked = false;
      } else {
        await db.videoLike.create({
          data: { videoId: id, userId: user.id },
        });
        liked = true;

        if (video.creatorId !== user.id) {
          const actorName = user.displayName || user.username || 'Someone';
          createNotification({
            userId: video.creatorId,
            actorId: user.id,
            type: 'LIKE_VIDEO',
            title: 'New Like on Video',
            message: `${actorName} liked your video "${video.title}"`,
            entityType: 'Video',
            entityId: video.id,
          }).catch((err) => console.warn('Failed to send like notification:', err));
        }
      }

      const likeCount = await db.videoLike.count({ where: { videoId: id } });
      return apiSuccess({ liked, likeCount });
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
    const videoContainer = getContainer('videos');
    const likeContainer = getContainer('videoLikes');

    if (videoContainer && likeContainer) {
      const { resources: videos } = await videoContainer.items
        .query({ query: 'SELECT c.id, c.status FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();
      const video = videos[0];
      if (!video) return apiError('VIDEO_NOT_FOUND');

      const [{ resources: existingLikes }, { resources: countResult }] = await Promise.all([
        likeContainer.items.query({
          query: 'SELECT * FROM c WHERE c.videoId = @videoId AND c.userId = @userId',
          parameters: [
            { name: '@videoId', value: id },
            { name: '@userId', value: user.id }
          ]
        }).fetchAll(),
        likeContainer.items.query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.videoId = @videoId',
          parameters: [{ name: '@videoId', value: id }]
        }).fetchAll()
      ]);

      return apiSuccess({ liked: existingLikes.length > 0, likeCount: countResult[0] || 0 });
    } else {
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
    }
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
