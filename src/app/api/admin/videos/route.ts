import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiPaginated, apiError } from '@/lib/api-response';
import { paginationSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { searchParams } = new URL(request.url);
  const pagination = paginationSchema.parse(Object.fromEntries(searchParams));
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const status = searchParams.get('status') || undefined;
  const genre = searchParams.get('genre') || undefined;
  const search = searchParams.get('search') || undefined;

  try {
    const container = getContainer('videos');
    if (container) {
      let queryStr = 'SELECT * FROM c WHERE 1=1';
      let parameters: any[] = [];
      let paramCount = 0;

      if (status) {
        queryStr += ` AND c.status = @param${paramCount}`;
        parameters.push({ name: `@param${paramCount}`, value: status });
        paramCount++;
      }
      
      if (genre) {
        queryStr += ` AND c.genre = @param${paramCount}`;
        parameters.push({ name: `@param${paramCount}`, value: genre });
        paramCount++;
      }

      if (search) {
        queryStr += ` AND (CONTAINS(LOWER(c.title), @param${paramCount}) OR CONTAINS(LOWER(c.publisher), @param${paramCount}) OR CONTAINS(LOWER(c.producer), @param${paramCount}))`;
        parameters.push({ name: `@param${paramCount}`, value: search.toLowerCase() });
        paramCount++;
      }

      const countQuery = queryStr.replace('SELECT * FROM c', 'SELECT VALUE COUNT(1) FROM c');
      const { resources: countRes } = await container.items.query({ query: countQuery, parameters }).fetchAll();
      const total = countRes[0] || 0;

      const pageQuery = queryStr + ` ORDER BY c.createdAt DESC OFFSET ${skip} LIMIT ${limit}`;
      const { resources: pageVideos } = await container.items.query({ query: pageQuery, parameters }).fetchAll();

      const creatorProfilesContainer = getContainer('creatorProfiles');
      const commentsContainer = getContainer('comments');
      const videoLikesContainer = getContainer('videoLikes');

      const videos: Array<Record<string, any>> = [];
      for (const v of pageVideos) {
        let creator: Record<string, any> | null = null;
        if (creatorProfilesContainer) {
          const { resources } = await creatorProfilesContainer.items.query<Record<string, any>>({
            query: 'SELECT * FROM c WHERE c.id = @creatorId',
            parameters: [{ name: '@creatorId', value: v.creatorId }]
          }).fetchAll();
          if (resources.length > 0) {
            creator = { id: resources[0].id, creatorName: resources[0].creatorName };
          }
        }
        
        let commentCount = 0;
        if (commentsContainer) {
          const { resources } = await commentsContainer.items.query<number>({
            query: 'SELECT VALUE COUNT(1) FROM c WHERE c.videoId = @videoId',
            parameters: [{ name: '@videoId', value: v.id }]
          }).fetchAll();
          commentCount = resources[0] || 0;
        }

        let likeCount = 0;
        if (videoLikesContainer) {
          const { resources } = await videoLikesContainer.items.query<number>({
            query: 'SELECT VALUE COUNT(1) FROM c WHERE c.videoId = @videoId',
            parameters: [{ name: '@videoId', value: v.id }]
          }).fetchAll();
          likeCount = resources[0] || 0;
        }

        videos.push({
          id: v.id,
          title: v.title,
          publisher: v.publisher,
          producer: v.producer,
          genre: v.genre,
          ageRating: v.ageRating,
          status: v.status,
          viewCount: v.viewCount || 0,
          commentCount,
          likeCount,
          creator,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        });
      }

      return apiPaginated(videos, page, limit, total);
      
    } else {
      const where: Record<string, unknown> = {};

      if (status) where.status = status;
      if (genre) where.genre = genre;
      if (search) {
        where.OR = [
          { title: { contains: search } },
          { publisher: { contains: search } },
          { producer: { contains: search } },
        ];
      }

      const [videos, total] = await Promise.all([
        db.video.findMany({
          where,
          include: {
            creator: { select: { id: true, creatorName: true } },
            _count: { select: { comments: true, likes: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
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
          commentCount: v._count.comments,
          likeCount: v._count.likes,
          creator: v.creator,
          createdAt: v.createdAt.toISOString(),
          updatedAt: v.updatedAt.toISOString(),
        })),
        page,
        limit,
        total
      );
    }
  } catch {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
