import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiPaginated, apiError } from '@/lib/api-response';
import { paginationSchema } from '@/lib/validation';

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

  const where: Record<string, unknown> = { creatorId: user.id };
  if (status) where.status = status;

  try {
    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
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
