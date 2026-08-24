import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiCreated, apiError } from '@/lib/api-response';
import { commentSchema, paginationSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { createNotification } from '@/services/notification';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const replyCommentSchema = commentSchema.extend({
  parentCommentId: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  const { id } = await params;

  const { searchParams } = new URL(request.url);
  const pagination = paginationSchema.parse(Object.fromEntries(searchParams));
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  try {
    const videoContainer = getContainer('videos');
    const commentContainer = getContainer('comments');
    const likeContainer = getContainer('commentLikes');

    if (videoContainer && commentContainer && likeContainer) {
      const { resources: videos } = await videoContainer.items
        .query({ query: 'SELECT c.id, c.creatorId, c.pinnedCommentId FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();
      const video = videos[0];
      if (!video) return apiError('VIDEO_NOT_FOUND');

      let conditions = ['c.videoId = @vid', 'IS_NULL(c.parentCommentId)'];
      let parameters: any[] = [{ name: '@vid', value: id }];

      if (!user || user.role !== 'ADMIN') {
        conditions.push('c.status = "VISIBLE"');
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const [{ resources: comments }, { resources: countRes }] = await Promise.all([
        commentContainer.items.query({
          query: `SELECT * FROM c ${whereClause} ORDER BY c.createdAt DESC OFFSET @skip LIMIT @limit`,
          parameters: [...parameters, { name: '@skip', value: skip }, { name: '@limit', value: limit }]
        }).fetchAll(),
        commentContainer.items.query({
          query: `SELECT VALUE COUNT(1) FROM c ${whereClause}`,
          parameters
        }).fetchAll()
      ]);
      const total = countRes[0] || 0;

      let userCommentLikes = new Set<string>();
      if (user && comments.length > 0) {
        const cIds = comments.map((c: any) => `'${c.id}'`).join(',');
        const { resources: likes } = await likeContainer.items.query({
          query: `SELECT * FROM c WHERE c.userId = @uid AND c.commentId IN (${cIds})`,
          parameters: [{ name: '@uid', value: user.id }]
        }).fetchAll();
        userCommentLikes = new Set(likes.map((l: any) => l.commentId));
      }

      for (const c of comments) {
        const { resources: rCount } = await commentContainer.items.query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.parentCommentId = @cid AND c.status = "VISIBLE"',
          parameters: [{ name: '@cid', value: c.id }]
        }).fetchAll();
        
        const { resources: lCount } = await likeContainer.items.query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.commentId = @cid',
          parameters: [{ name: '@cid', value: c.id }]
        }).fetchAll();

        c._count = { replies: rCount[0] || 0, likes: lCount[0] || 0 };
      }

      let sortedComments = [...comments];
      if (video.pinnedCommentId) {
        const pinnedIdx = sortedComments.findIndex((c) => c.id === video.pinnedCommentId);
        if (pinnedIdx > 0) {
          const [pinnedItem] = sortedComments.splice(pinnedIdx, 1);
          sortedComments.unshift(pinnedItem);
        } else if (pinnedIdx === -1 && page === 1) {
          const { resources: pinnedComments } = await commentContainer.items.query({
            query: 'SELECT * FROM c WHERE c.id = @cid',
            parameters: [{ name: '@cid', value: video.pinnedCommentId }]
          }).fetchAll();
          const pinnedComment = pinnedComments[0];
          
          if (pinnedComment && (user?.role === 'ADMIN' || pinnedComment.status === 'VISIBLE')) {
            const { resources: rCount } = await commentContainer.items.query({
              query: 'SELECT VALUE COUNT(1) FROM c WHERE c.parentCommentId = @cid AND c.status = "VISIBLE"',
              parameters: [{ name: '@cid', value: pinnedComment.id }]
            }).fetchAll();
            const { resources: lCount } = await likeContainer.items.query({
              query: 'SELECT VALUE COUNT(1) FROM c WHERE c.commentId = @cid',
              parameters: [{ name: '@cid', value: pinnedComment.id }]
            }).fetchAll();
            pinnedComment._count = { replies: rCount[0] || 0, likes: lCount[0] || 0 };
            
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
          replyCount: c._count?.replies || 0,
          likeCount: c._count?.likes || 0,
          ...(user ? { userLiked: userCommentLikes.has(c.id) } : {}),
          createdAt: typeof c.createdAt === 'string' ? c.createdAt : c.createdAt?.toISOString(),
          updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : c.updatedAt?.toISOString(),
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

    } else {
      const video = await db.video.findUnique({
        where: { id },
        select: { id: true, creatorId: true, pinnedCommentId: true },
      });
      if (!video) return apiError('VIDEO_NOT_FOUND');

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

      let userCommentLikes: Set<string> = new Set();
      if (user) {
        const commentIds = comments.map((c) => c.id);
        const likes = await db.commentLike.findMany({
          where: { commentId: { in: commentIds }, userId: user.id },
          select: { commentId: true },
        });
        userCommentLikes = new Set(likes.map((l) => l.commentId));
      }

      let sortedComments = [...comments];
      if (video.pinnedCommentId) {
        const pinnedIdx = sortedComments.findIndex((c) => c.id === video.pinnedCommentId);
        if (pinnedIdx > 0) {
          const [pinnedItem] = sortedComments.splice(pinnedIdx, 1);
          sortedComments.unshift(pinnedItem);
        } else if (pinnedIdx === -1 && page === 1) {
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
    }
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

  try {
    const videoContainer = getContainer('videos');
    const commentContainer = getContainer('comments');

    if (videoContainer && commentContainer) {
      const { resources: videos } = await videoContainer.items
        .query({ query: 'SELECT c.id, c.creatorId, c.title FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();
      const video = videos[0];
      if (!video) return apiError('VIDEO_NOT_FOUND');

      const body = await request.json();
      const parsed = replyCommentSchema.safeParse(body);
      if (!parsed.success) {
        return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
      }

      let parentCommentUserId: string | null = null;
      let parentCommentSnippet = '';
      if (parsed.data.parentCommentId) {
        const { resources: parents } = await commentContainer.items
          .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: parsed.data.parentCommentId }] })
          .fetchAll();
        const parentComment = parents[0];
        if (!parentComment || parentComment.videoId !== id) {
          return apiError('VALIDATION_ERROR', 'Parent comment not found or does not belong to this video.');
        }
        parentCommentUserId = parentComment.userId;
        parentCommentSnippet = parentComment.content.length > 30 ? `${parentComment.content.slice(0, 30)}...` : parentComment.content;
      }

      const commentData = {
        id: uuidv4(),
        videoId: id,
        userId: user.id,
        content: parsed.data.content,
        parentCommentId: parsed.data.parentCommentId ?? null,
        status: 'VISIBLE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: {
          id: user.id,
          displayName: user.displayName,
          username: user.username || null,
          avatarUrl: user.avatarUrl || null,
        }
      };

      await commentContainer.items.create(commentData);

      const actorName = user.displayName || user.username || 'Someone';

      if (parentCommentUserId && parentCommentUserId !== user.id) {
        createNotification({
          userId: parentCommentUserId,
          actorId: user.id,
          type: 'COMMENT_REPLY',
          title: 'New Reply to Your Comment',
          message: `${actorName} replied to your comment: "${parentCommentSnippet}"`,
          entityType: 'Comment',
          entityId: commentData.id,
        }).catch((err) => console.warn('Reply notification error:', err));
      } else if (!parentCommentUserId && video.creatorId !== user.id) {
        createNotification({
          userId: video.creatorId,
          actorId: user.id,
          type: 'VIDEO_COMMENT',
          title: 'New Comment on Video',
          message: `${actorName} commented on your video "${video.title}"`,
          entityType: 'Video',
          entityId: video.id,
        }).catch((err) => console.warn('Comment notification error:', err));
      }

      return apiCreated({
        id: commentData.id,
        content: commentData.content,
        status: commentData.status,
        parentCommentId: commentData.parentCommentId,
        createdAt: commentData.createdAt,
        updatedAt: commentData.updatedAt,
        user: commentData.user,
      });

    } else {
      const video = await db.video.findUnique({ where: { id } });
      if (!video) return apiError('VIDEO_NOT_FOUND');

      const body = await request.json();
      const parsed = replyCommentSchema.safeParse(body);
      if (!parsed.success) {
        return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
      }

      let parentCommentUserId: string | null = null;
      let parentCommentSnippet = '';
      if (parsed.data.parentCommentId) {
        const parentComment = await db.comment.findUnique({
          where: { id: parsed.data.parentCommentId },
          select: { videoId: true, userId: true, content: true },
        });
        if (!parentComment || parentComment.videoId !== id) {
          return apiError('VALIDATION_ERROR', 'Parent comment not found or does not belong to this video.');
        }
        parentCommentUserId = parentComment.userId;
        parentCommentSnippet = parentComment.content.length > 30 ? `${parentComment.content.slice(0, 30)}...` : parentComment.content;
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

      const actorName = user.displayName || user.username || 'Someone';

      if (parentCommentUserId && parentCommentUserId !== user.id) {
        createNotification({
          userId: parentCommentUserId,
          actorId: user.id,
          type: 'COMMENT_REPLY',
          title: 'New Reply to Your Comment',
          message: `${actorName} replied to your comment: "${parentCommentSnippet}"`,
          entityType: 'Comment',
          entityId: comment.id,
        }).catch((err) => console.warn('Reply notification error:', err));
      } else if (!parentCommentUserId && video.creatorId !== user.id) {
        createNotification({
          userId: video.creatorId,
          actorId: user.id,
          type: 'VIDEO_COMMENT',
          title: 'New Comment on Video',
          message: `${actorName} commented on your video "${video.title}"`,
          entityType: 'Video',
          entityId: video.id,
        }).catch((err) => console.warn('Comment notification error:', err));
      }

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
    }
  } catch (error) {
    logger.error('Create comment failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
