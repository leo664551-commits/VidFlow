import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiNoContent, apiError } from '@/lib/api-response';
import { videoMetadataSchema } from '@/lib/validation';
import { deleteBlob } from '@/services/storage';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/services/audit';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  const { id } = await params;

  try {
    const videoContainer = getContainer('videos');
    if (videoContainer) {
      const { resources: videos } = await videoContainer.items
        .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();
      const video = videos[0];

      if (!video) return apiError('VIDEO_NOT_FOUND');

      const creatorsContainer = getContainer('creatorProfiles');
      const usersContainer = getContainer('users');

      let creatorProfile: Record<string, any> | null = null;
      if (creatorsContainer && video.creatorId) {
        const { resources: profiles } = await creatorsContainer.items.query<Record<string, any>>({
          query: 'SELECT * FROM c WHERE c.id = @cid OR c.userId = @cid',
          parameters: [{ name: '@cid', value: video.creatorId }]
        }).fetchAll();
        creatorProfile = profiles[0] || null;
      }

      const creatorUserId = creatorProfile?.userId || video.creatorId;

      let creatorUser: Record<string, any> | null = null;
      if (usersContainer && creatorUserId) {
        const { resources: uList } = await usersContainer.items.query<Record<string, any>>({
          query: 'SELECT * FROM c WHERE c.id = @uid',
          parameters: [{ name: '@uid', value: creatorUserId }]
        }).fetchAll();
        creatorUser = uList[0] || null;
      }

      if (video.status !== 'READY') {
        if (!user || (user.role !== 'CREATOR' && user.role !== 'ADMIN')) {
          return apiError('VIDEO_NOT_FOUND');
        }
        if (user.role === 'CREATOR' && creatorUserId !== user.id && video.creatorId !== user.id) {
          return apiError('VIDEO_NOT_FOUND');
        }
      }

      let effectiveViewCount = video.viewCount || 0;
      if (user && video.status === 'READY') {
        const viewContainer = getContainer('videoViews');
        if (viewContainer) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const { resources: views } = await viewContainer.items.query({
            query: 'SELECT * FROM c WHERE c.videoId = @vid AND c.userId = @uid AND c.viewedAt >= @t1 AND c.viewedAt < @t2',
            parameters: [
              { name: '@vid', value: id },
              { name: '@uid', value: user.id },
              { name: '@t1', value: today.toISOString() },
              { name: '@t2', value: tomorrow.toISOString() }
            ]
          }).fetchAll();

          if (views.length === 0) {
            effectiveViewCount += 1;
            await viewContainer.items.create({
              id: uuidv4(),
              videoId: id,
              userId: user.id,
              viewedAt: new Date().toISOString()
            });
            const item = videoContainer.item(video.id, video.genre);
            await item.replace({ ...video, viewCount: effectiveViewCount });
          }
        }
      }

      const commentContainer = getContainer('comments');
      let commentCount = 0;
      if (commentContainer) {
        const { resources: cCount } = await commentContainer.items.query<number>({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.videoId = @vid AND c.status = "VISIBLE" AND IS_NULL(c.parentCommentId)',
          parameters: [{ name: '@vid', value: id }]
        }).fetchAll();
        commentCount = cCount[0] || 0;
      }

      let userLiked = false;
      let isFollowingCreator = false;
      const isCreatorSelf = user ? user.id === creatorUserId : false;

      if (user) {
        const likeContainer = getContainer('videoLikes');
        if (likeContainer) {
          const { resources: likes } = await likeContainer.items.query({
            query: 'SELECT * FROM c WHERE c.videoId = @vid AND c.userId = @uid',
            parameters: [{ name: '@vid', value: id }, { name: '@uid', value: user.id }]
          }).fetchAll();
          if (likes.length > 0) userLiked = true;
        }

        const followContainer = getContainer('follows');
        if (followContainer && creatorUserId) {
          const { resources: follows } = await followContainer.items.query({
            query: 'SELECT * FROM c WHERE c.followerId = @fid AND c.followingId = @tid',
            parameters: [{ name: '@fid', value: user.id }, { name: '@tid', value: creatorUserId }]
          }).fetchAll();
          if (follows.length > 0) isFollowingCreator = true;
        }
      }

      const likeContainer = getContainer('videoLikes');
      let likeCount = 0;
      if (likeContainer) {
        const { resources: lCount } = await likeContainer.items.query<number>({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.videoId = @vid',
          parameters: [{ name: '@vid', value: id }]
        }).fetchAll();
        likeCount = lCount[0] || 0;
      }

      const cp = creatorProfile || { id: video.creatorId, creatorName: video.publisher || 'Creator' };
      const cu = creatorUser || { displayName: video.publisher || 'Creator', username: null, avatarUrl: null };

      return apiSuccess({
        id: video.id,
        title: video.title,
        publisher: video.publisher,
        producer: video.producer,
        genre: video.genre,
        ageRating: video.ageRating,
        description: video.description,
        storageBlobName: video.storageBlobName,
        thumbnailBlobName: video.thumbnailBlobName,
        duration: video.duration,
        status: video.status,
        viewCount: effectiveViewCount,
        pinnedCommentId: video.pinnedCommentId,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt,
        creator: {
          id: cp.id,
          creatorName: cp.creatorName || cu.displayName,
          displayName: cu.displayName || cp.creatorName,
          username: cu.username || null,
          avatarUrl: cu.avatarUrl || null,
          isFollowing: isFollowingCreator,
          isSelf: isCreatorSelf,
        },
        likeCount,
        commentCount,
        ...(user ? { userLiked } : {}),
      });

    } else {
      const video = await db.video.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              creatorName: true,
              user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
        },
      });

      if (!video) return apiError('VIDEO_NOT_FOUND');

      if (video.status !== 'READY') {
        if (!user || (user.role !== 'CREATOR' && user.role !== 'ADMIN')) {
          return apiError('VIDEO_NOT_FOUND');
        }
        if (user.role === 'CREATOR' && video.creatorId !== user.id) {
          return apiError('VIDEO_NOT_FOUND');
        }
      }

      let effectiveViewCount = video.viewCount;
      if (user && video.status === 'READY') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingView = await db.videoView.findFirst({
          where: {
            videoId: id,
            userId: user.id,
            viewedAt: { gte: today, lt: tomorrow },
          },
        });

        if (!existingView) {
          effectiveViewCount += 1;
          await Promise.all([
            db.videoView.create({
              data: { videoId: id, userId: user.id },
            }),
            db.video.update({
              where: { id },
              data: { viewCount: { increment: 1 } },
            }),
          ]);
        }
      }

      const commentCount = await db.comment.count({
        where: { videoId: id, status: 'VISIBLE', parentCommentId: null },
      });

      let userLiked = false;
      let isFollowingCreator = false;
      let isCreatorSelf = false;

      if (user) {
        isCreatorSelf = user.id === video.creator.user.id;

        const [userLikeRecord, followRecord] = await Promise.all([
          db.videoLike.findUnique({
            where: { videoId_userId: { videoId: id, userId: user.id } },
          }),
          db.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: user.id,
                followingId: video.creator.user.id,
              },
            },
          }),
        ]);

        if (userLikeRecord) userLiked = true;
        if (followRecord) isFollowingCreator = true;
      }

      return apiSuccess({
        id: video.id,
        title: video.title,
        publisher: video.publisher,
        producer: video.producer,
        genre: video.genre,
        ageRating: video.ageRating,
        description: video.description,
        storageBlobName: video.storageBlobName,
        thumbnailBlobName: video.thumbnailBlobName,
        duration: video.duration,
        status: video.status,
        viewCount: effectiveViewCount,
        pinnedCommentId: video.pinnedCommentId,
        createdAt: video.createdAt.toISOString(),
        updatedAt: video.updatedAt.toISOString(),
        creator: {
          id: video.creator.id,
          creatorName: video.creator.creatorName,
          displayName: video.creator.user.displayName,
          username: video.creator.user.username || null,
          avatarUrl: video.creator.user.avatarUrl || null,
          isFollowing: isFollowingCreator,
          isSelf: isCreatorSelf,
        },
        likeCount: video._count.likes,
        commentCount,
        ...(user ? { userLiked } : {}),
      });
    }
  } catch (error) {
    logger.error('Get video failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const videoContainer = getContainer('videos');
    if (videoContainer) {
      const { resources: videos } = await videoContainer.items
        .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();
      const video = videos[0];
      if (!video) return apiError('VIDEO_NOT_FOUND');

      if (user.role === 'CREATOR' && video.creatorId !== user.id) {
        return apiError('FORBIDDEN');
      }

      const body = await request.json();
      const metadata = videoMetadataSchema.safeParse(body);
      if (!metadata.success) {
        return apiError('VALIDATION_ERROR', metadata.error.issues[0].message);
      }

      const updatedData = {
        ...video,
        title: metadata.data.title,
        publisher: metadata.data.publisher,
        producer: metadata.data.producer,
        genre: metadata.data.genre,
        ageRating: metadata.data.ageRating,
        description: metadata.data.description ?? null,
        ...(metadata.data.thumbnailBlobName !== undefined ? { thumbnailBlobName: metadata.data.thumbnailBlobName } : {}),
        updatedAt: new Date().toISOString()
      };

      const item = videoContainer.item(video.id, video.genre);
      await item.replace(updatedData);

      await createAuditLog(user.id, 'VIDEO_UPDATED', 'Video', id, { title: updatedData.title });

      return apiSuccess({
        id: updatedData.id,
        title: updatedData.title,
        publisher: updatedData.publisher,
        producer: updatedData.producer,
        genre: updatedData.genre,
        ageRating: updatedData.ageRating,
        description: updatedData.description,
        status: updatedData.status,
        createdAt: updatedData.createdAt,
        updatedAt: updatedData.updatedAt,
        creator: updatedData.creator,
      });

    } else {
      const video = await db.video.findUnique({ where: { id } });
      if (!video) return apiError('VIDEO_NOT_FOUND');

      if (user.role === 'CREATOR' && video.creatorId !== user.id) {
        return apiError('FORBIDDEN');
      }

      const body = await request.json();
      const metadata = videoMetadataSchema.safeParse(body);
      if (!metadata.success) {
        return apiError('VALIDATION_ERROR', metadata.error.issues[0].message);
      }

      const updated = await db.video.update({
        where: { id },
        data: {
          title: metadata.data.title,
          publisher: metadata.data.publisher,
          producer: metadata.data.producer,
          genre: metadata.data.genre,
          ageRating: metadata.data.ageRating,
          description: metadata.data.description ?? null,
          ...(metadata.data.thumbnailBlobName !== undefined ? { thumbnailBlobName: metadata.data.thumbnailBlobName } : {}),
        },
        include: { creator: { select: { id: true, creatorName: true } } },
      });

      await createAuditLog(user.id, 'VIDEO_UPDATED', 'Video', id, { title: updated.title });

      return apiSuccess({
        id: updated.id,
        title: updated.title,
        publisher: updated.publisher,
        producer: updated.producer,
        genre: updated.genre,
        ageRating: updated.ageRating,
        description: updated.description,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        creator: updated.creator,
      });
    }
  } catch (error) {
    logger.error('Update video failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const videoContainer = getContainer('videos');
    if (videoContainer) {
      const { resources: videos } = await videoContainer.items
        .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();
      const video = videos[0];
      if (!video) return apiError('VIDEO_NOT_FOUND');

      if (user.role === 'CREATOR' && video.creatorId !== user.id) {
        return apiError('FORBIDDEN');
      }

      if (video.storageBlobName) {
        await deleteBlob(video.storageBlobName);
      }
      if (video.thumbnailBlobName) {
        await deleteBlob(video.thumbnailBlobName);
      }

      await videoContainer.item(video.id, video.genre).delete();

      await createAuditLog(user.id, 'VIDEO_DELETED', 'Video', id, { title: video.title });
      logger.info('Video deleted', { videoId: id, userId: user.id });

      return apiNoContent();
    } else {
      const video = await db.video.findUnique({ where: { id } });
      if (!video) return apiError('VIDEO_NOT_FOUND');

      if (user.role === 'CREATOR' && video.creatorId !== user.id) {
        return apiError('FORBIDDEN');
      }

      if (video.storageBlobName) {
        await deleteBlob(video.storageBlobName);
      }
      if (video.thumbnailBlobName) {
        await deleteBlob(video.thumbnailBlobName);
      }

      await db.video.delete({ where: { id } });

      await createAuditLog(user.id, 'VIDEO_DELETED', 'Video', id, { title: video.title });
      logger.info('Video deleted', { videoId: id, userId: user.id });

      return apiNoContent();
    }
  } catch (error) {
    logger.error('Delete video failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
