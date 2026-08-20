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
  const videoId = searchParams.get('videoId') || undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (videoId) where.videoId = videoId;

  try {
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
  } catch {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
