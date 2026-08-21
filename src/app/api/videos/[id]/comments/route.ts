import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiCreated, apiError } from '@/lib/api-response';
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
  const video = await db.video.findUnique({
    where: { id },
    select: { id: true, creatorId: true, pinnedCommentId: true },
  });
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
          user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
          _count: {
            select: {
              replies: {
                where: { status: 'VISIBLE' },
              },
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

    // For authenticated users, fetch their comment likes
    let userCommentLikes: Set<string> = new Set();
    if (user) {
      const commentIds = comments.map((c) => c.id);
      const likes = await db.commentLike.findMany({
        where: { commentId: { in: commentIds }, userId: user.id },
        select: { commentId: true },
      });
      userCommentLikes = new Set(likes.map((l) => l.commentId));
    }

    // If a pinned comment exists, ensure it is placed at the very top of the list
    let sortedComments = [...comments];
    if (video.pinnedCommentId) {
      const pinnedIdx = sortedComments.findIndex((c) => c.id === video.pinnedCommentId);
      if (pinnedIdx > 0) {
        const [pinnedItem] = sortedComments.splice(pinnedIdx, 1);
        sortedComments.unshift(pinnedItem);
      } else if (pinnedIdx === -1 && page === 1) {
        // If pinned comment is not in the first page batch, fetch it and place at top
        const pinnedComment = await db.comment.findUnique({
          where: { id: video.pinnedCommentId },
          include: {
            user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
            _count: {
              select: {
                replies: { where: { status: 'VISIBLE' } },
                likes: true,
              },
            },
          },
        });
        if (pinnedComment && (user?.role === 'ADMIN' || pinnedComment.status === 'VISIBLE')) {
          sortedComments.unshift(pinnedComment);
        }
      }
    }

    return NextResponse.json({
      creatorId: video.creatorId,
      pinnedCommentId: video.pinnedCommentId,
      data: sortedComments.map((c) => ({
        id: c.id,
        content: c.content,
        status: c.status,
        replyCount: c._count.replies,
        likeCount: c._count.likes,
        ...(user ? { userLiked: userCommentLikes.has(c.id) } : {}),
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        user: {
          id: c.user.id,
          displayName: c.user.displayName,
          username: c.user.username || null,
          avatarUrl: c.user.avatarUrl || null,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('List comments failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CONSUMER' && user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  // Check video exists
  const video = await db.video.findUnique({ where: { id } });
  if (!video) return apiError('VIDEO_NOT_FOUND');

  try {
    const body = await request.json();
    const parsed = replyCommentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
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
        user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      },
    });

    return apiCreated({
      id: comment.id,
      content: comment.content,
      status: comment.status,
      parentCommentId: comment.parentCommentId,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      user: {
        id: comment.user.id,
        displayName: comment.user.displayName,
        username: comment.user.username || null,
        avatarUrl: comment.user.avatarUrl || null,
      },
    });
  } catch (error) {
    logger.error('Create comment failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
