import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiPaginated, apiCreated, apiError } from '@/lib/api-response';
import { paginationSchema, commentSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CONSUMER' && user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

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
          user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
          _count: {
            select: {
              likes: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.comment.count({ where }),
    ]);

    // Fetch authenticated user's comment likes for these replies
    let userCommentLikes: Set<string> = new Set();
    const replyIds = replies.map((r) => r.id);
    const likes = await db.commentLike.findMany({
      where: { commentId: { in: replyIds }, userId: user.id },
      select: { commentId: true },
    });
    userCommentLikes = new Set(likes.map((l) => l.commentId));

    return apiPaginated(
      replies.map((r) => ({
        id: r.id,
        content: r.content,
        likeCount: r._count.likes,
        userLiked: userCommentLikes.has(r.id),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        user: {
          id: r.user.id,
          displayName: r.user.displayName,
          username: (r.user as any).username || null,
          avatarUrl: (r.user as any).avatarUrl || null,
        },
      })),
      page,
      limit,
      total
    );
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CONSUMER' && user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  // Check parent comment exists and is visible (unless admin)
  const parentComment = await db.comment.findUnique({
    where: { id },
    select: { id: true, videoId: true, status: true },
  });
  if (!parentComment) return apiError('COMMENT_NOT_FOUND');
  if (user.role !== 'ADMIN' && parentComment.status !== 'VISIBLE') {
    return apiError('COMMENT_NOT_FOUND');
  }

  try {
    const body = await request.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
    }

    const reply = await db.comment.create({
      data: {
        videoId: parentComment.videoId,
        userId: user.id,
        content: parsed.data.content,
        parentCommentId: id,
      },
      include: {
        user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      },
    });

    return apiCreated({
      id: reply.id,
      content: reply.content,
      status: reply.status,
      parentCommentId: reply.parentCommentId,
      createdAt: reply.createdAt.toISOString(),
      updatedAt: reply.updatedAt.toISOString(),
      user: {
        id: reply.user.id,
        displayName: reply.user.displayName,
        username: (reply.user as any).username || null,
        avatarUrl: (reply.user as any).avatarUrl || null,
      },
    });
  } catch (error) {
    logger.error('Create reply failed', { error: (error as Error).message, parentCommentId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
