import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiPaginated, apiError } from '@/lib/api-response';
import { paginationSchema } from '@/lib/validation';
import { getContainer } from '@/lib/cosmos';
import { db } from '@/lib/db';
import { getDownloadUrl } from '@/services/storage';

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

      const likeContainer = getContainer('videoLikes');
      const commentContainer = getContainer('comments');
      const videoLikesMap = new Map<string, number>();
      const videoCommentsMap = new Map<string, number>();

      if (videos.length > 0) {
        await Promise.all(
          videos.map(async (v: Record<string, unknown>) => {
            const vidId = v.id as string;
            if (likeContainer) {
              try {
                const { resources } = await likeContainer.items.query<number>({
                  query: 'SELECT VALUE COUNT(1) FROM c WHERE c.videoId = @vid',
                  parameters: [{ name: '@vid', value: vidId }]
                }).fetchAll();
                videoLikesMap.set(vidId, resources[0] ?? ((v.likeCount as number) || 0));
              } catch {
                videoLikesMap.set(vidId, (v.likeCount as number) || 0);
              }
            }
            if (commentContainer) {
              try {
                const { resources } = await commentContainer.items.query<number>({
                  query: 'SELECT VALUE COUNT(1) FROM c WHERE c.videoId = @vid AND c.status = "VISIBLE"',
                  parameters: [{ name: '@vid', value: vidId }]
                }).fetchAll();
                videoCommentsMap.set(vidId, resources[0] ?? ((v.commentCount as number) || 0));
              } catch {
                videoCommentsMap.set(vidId, (v.commentCount as number) || 0);
              }
            }
          })
        );
      }

      return apiPaginated(
        videos.map((v: Record<string, unknown>) => ({
          id: v.id,
          title: v.title,
          publisher: v.publisher,
          producer: v.producer,
          genre: v.genre,
          ageRating: v.ageRating,
          status: v.status,
          viewCount: (v.viewCount as number) || 0,
          likeCount: videoLikesMap.get(v.id as string) ?? ((v.likeCount as number) || 0),
          commentCount: videoCommentsMap.get(v.id as string) ?? ((v.commentCount as number) || 0),
          storageBlobName: getDownloadUrl(v.storageBlobName as string),
          thumbnailBlobName: v.thumbnailBlobName ? getDownloadUrl(v.thumbnailBlobName as string) : null,
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
