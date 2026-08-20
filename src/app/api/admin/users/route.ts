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

  const search = searchParams.get('search') || undefined;
  const role = searchParams.get('role') || undefined;
  const status = searchParams.get('status') || undefined;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { email: { contains: search } },
      { displayName: { contains: search } },
    ];
  }
  if (role) where.role = role;
  if (status) where.status = status;

  try {
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              comments: true,
              ratings: true,
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
  } catch {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
