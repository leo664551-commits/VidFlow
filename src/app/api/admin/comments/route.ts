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
  const videoId = searchParams.get('videoId') || undefined;

  try {
    const container = getContainer('comments');
    if (container) {
      let queryStr = 'SELECT * FROM c WHERE 1=1';
      let parameters: any[] = [];
      let paramCount = 0;

      if (status) {
        queryStr += ` AND c.status = @param${paramCount}`;
        parameters.push({ name: `@param${paramCount}`, value: status });
        paramCount++;
      }
      if (videoId) {
        queryStr += ` AND c.videoId = @param${paramCount}`;
        parameters.push({ name: `@param${paramCount}`, value: videoId });
        paramCount++;
      }

      const countQuery = queryStr.replace('SELECT * FROM c', 'SELECT VALUE COUNT(1) FROM c');
      const { resources: countRes } = await container.items.query({ query: countQuery, parameters }).fetchAll();
      const total = countRes[0] || 0;

      const pageQuery = queryStr + ` ORDER BY c.createdAt DESC OFFSET ${skip} LIMIT ${limit}`;
      const { resources: pageComments } = await container.items.query({ query: pageQuery, parameters }).fetchAll();

      const usersContainer = getContainer('users');
      const videosContainer = getContainer('videos');

      const commentsList: Array<Record<string, any>> = [];
      for (const c of pageComments) {
        let commentUser: Record<string, any> | null = null;
        if (usersContainer) {
          const { resources } = await usersContainer.items.query<Record<string, any>>({
            query: 'SELECT * FROM c WHERE c.id = @userId',
            parameters: [{ name: '@userId', value: c.userId }]
          }).fetchAll();
          if (resources.length > 0) {
            commentUser = { id: resources[0].id, displayName: resources[0].displayName, email: resources[0].email };
          }
        }

        let video: Record<string, any> | null = null;
        if (videosContainer) {
          const { resources } = await videosContainer.items.query<Record<string, any>>({
            query: 'SELECT * FROM c WHERE c.id = @videoId',
            parameters: [{ name: '@videoId', value: c.videoId }]
          }).fetchAll();
          if (resources.length > 0) {
            video = { id: resources[0].id, title: resources[0].title };
          }
        }

        commentsList.push({
          id: c.id,
          content: c.content,
          status: c.status,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          user: commentUser,
          video,
        });
      }

      return apiPaginated(commentsList, page, limit, total);
      
    } else {
      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (videoId) where.videoId = videoId;

      const [comments, total] = await Promise.all([
        db.comment.findMany({
          where,
          include: {
            user: { select: { id: true, displayName: true, email: true } },
            video: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.comment.count({ where }),
      ]);

      return apiPaginated(
        comments.map((c) => ({
          id: c.id,
          content: c.content,
          status: c.status,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          user: c.user,
          video: c.video,
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
