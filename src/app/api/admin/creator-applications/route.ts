import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
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

  const where: Record<string, unknown> = {};
  if (status && status !== 'ALL') {
    where.status = status;
  }

  try {
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
  } catch (error) {
    console.error('Error fetching admin creator applications:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
