import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiPaginated, apiError } from '@/lib/api-response';
import { paginationSchema } from '@/lib/validation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CONSUMER' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  // Check parent comment exists
  const parentComment = await db.comment.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!parentComment) return apiError('COMMENT_NOT_FOUND');

  // Non-admin can only view replies to VISIBLE comments
  if (user.role !== 'ADMIN' && parentComment.status !== 'VISIBLE') {
    return apiError('COMMENT_NOT_FOUND');
  }

  const { searchParams } = new URL(request.url);
  const pagination = paginationSchema.parse(Object.fromEntries(searchParams));
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  try {
    const where: Record<string, unknown> = {
      parentCommentId: id,
      status: 'VISIBLE',
    };

    const [replies, total] = await Promise.all([
      db.comment.findMany({
        where,
        include: {
          user: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.comment.count({ where }),
    ]);

    return apiPaginated(
      replies.map((r) => ({
        id: r.id,
        content: r.content,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        user: r.user,
      })),
      page,
      limit,
      total
    );
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
