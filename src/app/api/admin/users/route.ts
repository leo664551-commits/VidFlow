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

  const search = searchParams.get('search') || undefined;
  const role = searchParams.get('role') || undefined;
  const status = searchParams.get('status') || undefined;

  try {
    const container = getContainer('users');
    if (container) {
      let queryStr = 'SELECT * FROM c WHERE 1=1';
      let parameters: any[] = [];
      let paramCount = 0;

      if (role) {
        queryStr += ` AND c.role = @param${paramCount}`;
        parameters.push({ name: `@param${paramCount}`, value: role });
        paramCount++;
      }
      if (status) {
        queryStr += ` AND c.status = @param${paramCount}`;
        parameters.push({ name: `@param${paramCount}`, value: status });
        paramCount++;
      }
      if (search) {
        queryStr += ` AND (CONTAINS(LOWER(c.email), @param${paramCount}) OR CONTAINS(LOWER(c.displayName), @param${paramCount}))`;
        parameters.push({ name: `@param${paramCount}`, value: search.toLowerCase() });
        paramCount++;
      }

      const countQuery = queryStr.replace('SELECT * FROM c', 'SELECT VALUE COUNT(1) FROM c');
      const { resources: countRes } = await container.items.query({ query: countQuery, parameters }).fetchAll();
      const total = countRes[0] || 0;

      const pageQuery = queryStr + ` ORDER BY c.createdAt DESC OFFSET ${skip} LIMIT ${limit}`;
      const { resources: pageUsers } = await container.items.query({ query: pageQuery, parameters }).fetchAll();

      const commentsContainer = getContainer('comments');
      const videoLikesContainer = getContainer('videoLikes');
      const creatorProfilesContainer = getContainer('creatorProfiles');

      const usersList: Array<Record<string, any>> = [];
      for (const u of pageUsers) {
        let commentCount = 0;
        if (commentsContainer) {
          const { resources } = await commentsContainer.items.query<number>({
            query: 'SELECT VALUE COUNT(1) FROM c WHERE c.userId = @userId',
            parameters: [{ name: '@userId', value: u.id }]
          }).fetchAll();
          commentCount = resources[0] || 0;
        }

        let likeCount = 0;
        if (videoLikesContainer) {
          const { resources } = await videoLikesContainer.items.query<number>({
            query: 'SELECT VALUE COUNT(1) FROM c WHERE c.userId = @userId',
            parameters: [{ name: '@userId', value: u.id }]
          }).fetchAll();
          likeCount = resources[0] || 0;
        }

        let creatorProfile: Record<string, any> | null = null;
        if (creatorProfilesContainer) {
          const { resources } = await creatorProfilesContainer.items.query<Record<string, any>>({
            query: 'SELECT * FROM c WHERE c.userId = @userId',
            parameters: [{ name: '@userId', value: u.id }]
          }).fetchAll();
          if (resources.length > 0) {
            creatorProfile = { id: resources[0].id, creatorName: resources[0].creatorName };
          }
        }

        usersList.push({
          id: u.id,
          email: u.email,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt,
          _count: {
            comments: commentCount,
            videoLikes: likeCount,
          },
          creatorProfile,
        });
      }

      return apiPaginated(usersList, page, limit, total);
      
    } else {
      const where: Record<string, unknown> = {};

      if (search) {
        where.OR = [
          { email: { contains: search } },
          { displayName: { contains: search } },
        ];
      }
      if (role) where.role = role;
      if (status) where.status = status;

      const [users, total] = await Promise.all([
        db.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                comments: true,
                videoLikes: true,
              },
            },
            creatorProfile: {
              select: { id: true, creatorName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.user.count({ where }),
      ]);

      return apiPaginated(
        users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
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
