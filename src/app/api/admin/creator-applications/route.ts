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

  try {
    const container = getContainer('creatorApplications');
    if (container) {
      let queryStr = 'SELECT * FROM c WHERE 1=1';
      let parameters: any[] = [];
      let paramCount = 0;

      if (status && status !== 'ALL') {
        queryStr += ` AND c.status = @param${paramCount}`;
        parameters.push({ name: `@param${paramCount}`, value: status });
        paramCount++;
      }

      const countQuery = queryStr.replace('SELECT * FROM c', 'SELECT VALUE COUNT(1) FROM c');
      const { resources: countRes } = await container.items.query({ query: countQuery, parameters }).fetchAll();
      const total = countRes[0] || 0;

      const pageQuery = queryStr + ` ORDER BY c.createdAt DESC OFFSET ${skip} LIMIT ${limit}`;
      const { resources: pageApps } = await container.items.query({ query: pageQuery, parameters }).fetchAll();

      const usersContainer = getContainer('users');
      const applicationsList: Array<Record<string, any>> = [];

      for (const app of pageApps) {
        let appUser: Record<string, any> | null = null;
        if (usersContainer) {
          const { resources } = await usersContainer.items.query<Record<string, any>>({
            query: 'SELECT * FROM c WHERE c.id = @userId',
            parameters: [{ name: '@userId', value: app.userId }]
          }).fetchAll();
          if (resources.length > 0) {
            const u = resources[0];
            appUser = {
              id: u.id,
              email: u.email,
              username: u.username,
              displayName: u.displayName,
              avatarUrl: u.avatarUrl,
              status: u.status,
              createdAt: u.createdAt
            };
          }
        }

        applicationsList.push({
          id: app.id,
          userId: app.userId,
          category: app.category,
          description: app.description,
          socialLink: app.socialLink,
          status: app.status,
          reviewedAt: app.reviewedAt ? app.reviewedAt : null,
          reviewedBy: app.reviewedBy,
          createdAt: app.createdAt,
          user: appUser,
        });
      }

      return apiPaginated(applicationsList, page, limit, total);
    } else {
      const where: Record<string, unknown> = {};
      if (status && status !== 'ALL') {
        where.status = status;
      }

      const [applications, total] = await Promise.all([
        db.creatorApplication.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.creatorApplication.count({ where }),
      ]);

      return apiPaginated(
        applications.map((app) => ({
          id: app.id,
          userId: app.userId,
          category: app.category,
          description: app.description,
          socialLink: app.socialLink,
          status: app.status,
          reviewedAt: app.reviewedAt ? app.reviewedAt.toISOString() : null,
          reviewedBy: app.reviewedBy,
          createdAt: app.createdAt.toISOString(),
          user: {
            ...app.user,
            createdAt: app.user.createdAt.toISOString(),
          },
        })),
        page,
        limit,
        total
      );
    }
  } catch (error) {
    console.error('Error fetching admin creator applications:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
