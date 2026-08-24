import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiPaginated, apiError } from '@/lib/api-response';
import { paginationSchema } from '@/lib/validation';
import { getContainer } from '@/lib/cosmos';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CREATOR') return apiError('FORBIDDEN');

  if (!user.creatorProfile) return apiError('FORBIDDEN', 'No creator profile found');

  const { searchParams } = new URL(request.url);
  const pagination = paginationSchema.parse(Object.fromEntries(searchParams));
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;
  const status = searchParams.get('status') || undefined;

  try {
    const container = getContainer('videos');
    if (container) {
      // Cosmos DB path
      let query = 'SELECT * FROM c WHERE c.creatorId = @creatorId';
      const parameters: Array<{ name: string; value: string }> = [
        { name: '@creatorId', value: user.id },
      ];
      if (status) {
        query += ' AND c.status = @status';
        parameters.push({ name: '@status', value: status });
      }

      const { resources: allVideos } = await container.items
        .query({ query: query + ' ORDER BY c.createdAt DESC', parameters })
        .fetchAll();

      const total = allVideos.length;
      const videos = allVideos.slice(skip, skip + limit);

      return apiPaginated(
        videos.map((v: Record<string, unknown>) => ({
          id: v.id,
          title: v.title,
          publisher: v.publisher,
          producer: v.producer,
          genre: v.genre,
          ageRating: v.ageRating,
          status: v.status,
          viewCount: v.viewCount || 0,
          likeCount: v.likeCount || 0,
          commentCount: v.commentCount || 0,
          storageBlobName: v.storageBlobName,
          thumbnailBlobName: v.thumbnailBlobName,
          duration: v.duration,
          description: v.description,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        })),
        page,
        limit,
        total
      );
    }

    // Prisma fallback
    const where: Record<string, unknown> = { creatorId: user.id };
    if (status) where.status = status;

    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      db.video.count({ where }),
    ]);

    return apiPaginated(
      videos.map((v) => ({
        id: v.id,
        title: v.title,
        publisher: v.publisher,
        producer: v.producer,
        genre: v.genre,
        ageRating: v.ageRating,
        status: v.status,
        viewCount: v.viewCount,
        likeCount: v._count?.likes ?? 0,
        commentCount: v._count?.comments ?? 0,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      })),
      page,
      limit,
      total
    );
  } catch {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
