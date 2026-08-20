import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { apiPaginated, apiError } from '@/lib/api-response';
import { z } from 'zod';
import { GENRES } from '@/config';

const feedPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  genre: z.enum(GENRES as unknown as [string, ...string[]]).optional(),
});

export async function GET(request: NextRequest) {
  const user = await getSession(request);

  const { searchParams } = new URL(request.url);
  const parsed = feedPaginationSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
  }

  const { page, limit, genre } = parsed.data;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { status: 'READY' };
  if (genre) {
    where.genre = genre;
  }

  try {
    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          publisher: true,
          producer: true,
          genre: true,
          ageRating: true,
          thumbnailBlobName: true,
          storageBlobName: true,
          duration: true,
          viewCount: true,
          pinnedCommentId: true,
          createdAt: true,
          creator: {
            select: {
              id: true,
              creatorName: true,
              user: { select: { displayName: true } },
            },
          },
          _count: {
            select: {
              likes: true,
              comments: {
                where: { status: 'VISIBLE', parentCommentId: null },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.video.count({ where }),
    ]);

    // If user is authenticated, fetch their likes for these videos
    let userLikes: Set<string> = new Set();

    if (user) {
      const videoIds = videos.map((v) => v.id);

      const likes = await db.videoLike.findMany({
        where: { videoId: { in: videoIds }, userId: user.id },
        select: { videoId: true },
      });

      userLikes = new Set(likes.map((l) => l.videoId));
    }

    const data = videos.map((v) => {
      const result: Record<string, unknown> = {
        id: v.id,
        title: v.title,
        description: v.description,
        creator: {
          id: v.creator.id,
          creatorName: v.creator.creatorName,
          displayName: v.creator.user.displayName,
        },
        publisher: v.publisher,
        producer: v.producer,
        genre: v.genre,
        ageRating: v.ageRating,
        thumbnailBlobName: v.thumbnailBlobName,
        storageBlobName: v.storageBlobName,
        duration: v.duration,
        viewCount: v.viewCount,
        likeCount: v._count.likes,
        commentCount: v._count.comments,
        pinnedCommentId: v.pinnedCommentId,
        createdAt: v.createdAt.toISOString(),
      };

      // Include user-specific data only if authenticated
      if (user) {
        result.userLiked = userLikes.has(v.id);
      }

      return result;
    });

    return apiPaginated(data, page, limit, total);
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
