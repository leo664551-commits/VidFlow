import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED', 'Please log in to view your liked videos');

  try {
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
  } catch (error) {
    console.error('Error fetching liked videos:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
