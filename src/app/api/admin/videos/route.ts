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
  const genre = searchParams.get('genre') || undefined;
  const search = searchParams.get('search') || undefined;

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

  try {
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
  } catch {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
