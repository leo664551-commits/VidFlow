import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED', 'Please log in to view your ratings');

  try {
    const container = getContainer('creatorRatings');
    if (container) {
      const { resources: ratings } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.updatedAt DESC',
        parameters: [{ name: '@userId', value: user.id }]
      }).fetchAll();

      const creatorsContainer = getContainer('creatorProfiles');
      const usersContainer = getContainer('users');

      const formattedRatings = await Promise.all(ratings.map(async (r: Record<string, any>) => {
        let creatorProfile: Record<string, any> | null = null;
        if (creatorsContainer) {
          const { resources } = await creatorsContainer.items.query<Record<string, any>>({
            query: 'SELECT c.id, c.userId, c.creatorName FROM c WHERE c.id = @creatorId',
            parameters: [{ name: '@creatorId', value: r.creatorId }]
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

        const cp = creatorProfile || { id: r.creatorId, userId: r.creatorId, creatorName: 'Unknown' };

        return {
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
          tags: r.tags ? (typeof r.tags === 'string' ? r.tags.split(',') : r.tags) : [],
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          creator: {
            id: cp.id,
            userId: cp.userId,
            creatorName: cp.creatorName,
            displayName: creatorUser?.displayName || cp.creatorName,
            username: creatorUser?.username || cp.creatorName,
            avatarUrl: creatorUser?.avatarUrl || null,
          },
        };
      }));

      return apiSuccess({
        data: formattedRatings,
        total: formattedRatings.length,
      });

    } else {
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
    }
  } catch (error) {
    console.error('Error fetching consumer ratings:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
