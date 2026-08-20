import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiCreated, apiPaginated, apiError } from '@/lib/api-response';
import { commentSchema, paginationSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const replyCommentSchema = commentSchema.extend({
  parentCommentId: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  const { id } = await params;

  // Check video exists
  const video = await db.video.findUnique({ where: { id } });
  if (!video) return apiError('VIDEO_NOT_FOUND');

  const { searchParams } = new URL(request.url);
  const pagination = paginationSchema.parse(Object.fromEntries(searchParams));
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  try {
    // Only top-level comments (parentCommentId = null)
    // Consumers see only VISIBLE comments, admins see all
    const where: Record<string, unknown> = { videoId: id, parentCommentId: null };
    if (!user || user.role !== 'ADMIN') {
      where.status = 'VISIBLE';
    }

    const [comments, total] = await Promise.all([
      db.comment.findMany({
        where,
        include: {
          user: { select: { id: true, displayName: true } },
          _count: {
            select: {
              replies: {
                where: { status: 'VISIBLE' },
              },
            },
          },
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
        replyCount: c._count.replies,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        user: c.user,
      })),
      page,
      limit,
      total
    );
  } catch (error) {
    logger.error('List comments failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CONSUMER' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  // Check video exists
  const video = await db.video.findUnique({ where: { id } });
  if (!video) return apiError('VIDEO_NOT_FOUND');

  try {
    const body = await request.json();
    const parsed = replyCommentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors[0].message);
    }

    // If parentCommentId is provided, validate it belongs to this video
    if (parsed.data.parentCommentId) {
      const parentComment = await db.comment.findUnique({
        where: { id: parsed.data.parentCommentId },
        select: { videoId: true },
      });
      if (!parentComment || parentComment.videoId !== id) {
        return apiError('VALIDATION_ERROR', 'Parent comment not found or does not belong to this video.');
      }
    }

    const comment = await db.comment.create({
      data: {
        videoId: id,
        userId: user.id,
        content: parsed.data.content,
        parentCommentId: parsed.data.parentCommentId ?? null,
      },
      include: {
        user: { select: { id: true, displayName: true } },
      },
    });

    return apiCreated({
      id: comment.id,
      content: comment.content,
      status: comment.status,
      parentCommentId: comment.parentCommentId,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      user: comment.user,
    });
  } catch (error) {
    logger.error('Create comment failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
