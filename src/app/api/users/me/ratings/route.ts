import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED', 'Please log in to view your ratings');

  try {
    const ratings = await db.creatorRating.findMany({
      where: {
        userId: user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            userId: true,
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
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const formattedRatings = ratings.map((r) => ({
      id: r.id,
      creatorId: r.creatorId,
      overallRating: r.overallRating || (r.rating ? r.rating * 2 : 10),
      rating: r.rating || 5,
      contentQuality: r.contentQuality ?? 8,
      valueRating: r.valueRating ?? 8,
      creativityRating: r.creativityRating ?? 8,
      entertainmentRating: r.entertainmentRating ?? 8,
      consistencyRating: r.consistencyRating ?? 8,
      review: r.review,
      tags: r.tags ? r.tags.split(',') : [],
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      creator: {
        id: r.creator.id,
        userId: r.creator.userId,
        creatorName: r.creator.creatorName,
        displayName: r.creator.user?.displayName || r.creator.creatorName,
        username: r.creator.user?.username || r.creator.creatorName,
        avatarUrl: r.creator.user?.avatarUrl || null,
      },
    }));

    return apiSuccess({
      data: formattedRatings,
      total: formattedRatings.length,
    });
  } catch (error) {
    console.error('Error fetching consumer ratings:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
