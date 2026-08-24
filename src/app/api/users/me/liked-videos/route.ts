import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED', 'Please log in to view your liked videos');

  try {
    const container = getContainer('videoLikes');
    if (container) {
      const { resources: likes } = await container.items.query({
        query: 'SELECT c.videoId, c.createdAt FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
        parameters: [{ name: '@userId', value: user.id }]
      }).fetchAll();

      const videosContainer = getContainer('videos');
      const creatorsContainer = getContainer('creatorProfiles');
      const usersContainer = getContainer('users');
      const commentsContainer = getContainer('comments');

      const formattedVideos: Array<Record<string, any>> = [];
      for (const item of likes) {
        if (!videosContainer) break;
        
        const { resources: videos } = await videosContainer.items.query<Record<string, any>>({
          query: 'SELECT * FROM c WHERE c.id = @videoId AND c.status = "READY"',
          parameters: [{ name: '@videoId', value: item.videoId }]
        }).fetchAll();
        const v = videos[0];
        
        if (!v) continue;

        let creatorProfile: Record<string, any> | null = null;
        if (creatorsContainer) {
          const { resources } = await creatorsContainer.items.query<Record<string, any>>({
            query: 'SELECT c.id, c.userId, c.creatorName FROM c WHERE c.id = @creatorId',
            parameters: [{ name: '@creatorId', value: v.creatorId }]
          }).fetchAll();
          creatorProfile = resources[0] || null;
        }

        let creatorUser: Record<string, any> | null = null;
        if (usersContainer && creatorProfile?.userId) {
          const { resources } = await usersContainer.items.query<Record<string, any>>({
            query: 'SELECT c.id, c.displayName, c.username, c.avatarUrl FROM c WHERE c.id = @userId',
            parameters: [{ name: '@userId', value: creatorProfile.userId }]
          }).fetchAll();
          creatorUser = resources[0] || null;
        }

        let likeCount = 0;
        const { resources: likesCountRes } = await container.items.query<number>({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.videoId = @videoId',
          parameters: [{ name: '@videoId', value: v.id }]
        }).fetchAll();
        likeCount = likesCountRes[0] || 0;

        let commentCount = 0;
        if (commentsContainer) {
          const { resources } = await commentsContainer.items.query<number>({
            query: 'SELECT VALUE COUNT(1) FROM c WHERE c.videoId = @videoId AND c.status = "VISIBLE"',
            parameters: [{ name: '@videoId', value: v.id }]
          }).fetchAll();
          commentCount = resources[0] || 0;
        }

        const cp = creatorProfile || { id: v.creatorId, creatorName: 'Unknown' };

        formattedVideos.push({
          id: v.id,
          title: v.title,
          publisher: v.publisher,
          producer: v.producer,
          genre: v.genre,
          ageRating: v.ageRating,
          description: v.description,
          storageBlobName: v.storageBlobName,
          thumbnailBlobName: v.thumbnailBlobName,
          duration: v.duration,
          status: v.status,
          viewCount: v.viewCount,
          pinnedCommentId: v.pinnedCommentId,
          liked: true,
          likeCount: likeCount,
          commentCount: commentCount,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
          creator: {
            id: cp.id,
            creatorName: cp.creatorName,
            displayName: creatorUser?.displayName || cp.creatorName,
            avatarUrl: creatorUser?.avatarUrl || null,
          },
        });
      }

      return apiSuccess({
        data: formattedVideos,
        total: formattedVideos.length,
      });

    } else {
      const likes = await db.videoLike.findMany({
        where: {
          userId: user.id,
          video: { status: 'READY' },
        },
        include: {
          video: {
            include: {
              creator: {
                select: {
                  id: true,
                  creatorName: true,
                  user: {
                    select: {
                      id: true,
                      displayName: true,
                      username: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  likes: true,
                  comments: { where: { status: 'VISIBLE' } },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const formattedVideos = likes.map((item) => {
        const v = item.video;
        return {
          id: v.id,
          title: v.title,
          publisher: v.publisher,
          producer: v.producer,
          genre: v.genre,
          ageRating: v.ageRating,
          description: v.description,
          storageBlobName: v.storageBlobName,
          thumbnailBlobName: v.thumbnailBlobName,
          duration: v.duration,
          status: v.status,
          viewCount: v.viewCount,
          pinnedCommentId: v.pinnedCommentId,
          liked: true,
          likeCount: v._count?.likes ?? 0,
          commentCount: v._count?.comments ?? 0,
          createdAt: v.createdAt.toISOString(),
          updatedAt: v.updatedAt.toISOString(),
          creator: {
            id: v.creator.id,
            creatorName: v.creator.creatorName,
            displayName: v.creator.user?.displayName || v.creator.creatorName,
            avatarUrl: v.creator.user?.avatarUrl || null,
          },
        };
      });

      return apiSuccess({
        data: formattedVideos,
        total: formattedVideos.length,
      });
    }
  } catch (error) {
    console.error('Error fetching liked videos:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
