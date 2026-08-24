import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiPaginated, apiCreated, apiError } from '@/lib/api-response';
import { paginationSchema, commentSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CONSUMER' && user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const container = getContainer('comments');
    const likeContainer = getContainer('commentLikes');

    if (container && likeContainer) {
      const { resources: parentComments } = await container.items
        .query({ query: 'SELECT c.id, c.status FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();
      const parentComment = parentComments[0];
      if (!parentComment) return apiError('COMMENT_NOT_FOUND');

      if (user.role !== 'ADMIN' && parentComment.status !== 'VISIBLE') {
        return apiError('COMMENT_NOT_FOUND');
      }

      const { searchParams } = new URL(request.url);
      const pagination = paginationSchema.parse(Object.fromEntries(searchParams));
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const [{ resources: replies }, { resources: countRes }] = await Promise.all([
        container.items.query({
          query: 'SELECT * FROM c WHERE c.parentCommentId = @pid AND c.status = "VISIBLE" ORDER BY c.createdAt DESC OFFSET @skip LIMIT @limit',
          parameters: [
            { name: '@pid', value: id },
            { name: '@skip', value: skip },
            { name: '@limit', value: limit }
          ]
        }).fetchAll(),
        container.items.query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.parentCommentId = @pid AND c.status = "VISIBLE"',
          parameters: [{ name: '@pid', value: id }]
        }).fetchAll()
      ]);
      const total = countRes[0] || 0;

      let userCommentLikes = new Set<string>();
      if (replies.length > 0) {
        const replyIds = replies.map((r: any) => `'${r.id}'`).join(',');
        const { resources: userLikes } = await likeContainer.items.query({
          query: `SELECT * FROM c WHERE c.userId = @uid AND c.commentId IN (${replyIds})`,
          parameters: [{ name: '@uid', value: user.id }]
        }).fetchAll();
        userCommentLikes = new Set(userLikes.map((l: any) => l.commentId));

        for (const reply of replies) {
          const { resources: lCount } = await likeContainer.items.query({
            query: 'SELECT VALUE COUNT(1) FROM c WHERE c.commentId = @cid',
            parameters: [{ name: '@cid', value: reply.id }]
          }).fetchAll();
          reply._count = { likes: lCount[0] || 0 };
        }
      }

      const usersContainer = getContainer('users');
      const usersMap: Record<string, any> = {};
      const userIds = [...new Set(replies.map((r: any) => r.userId).filter(Boolean))];
      if (usersContainer && userIds.length > 0) {
        for (const uid of userIds) {
          const { resources: uList } = await usersContainer.items.query<Record<string, any>>({
            query: 'SELECT c.id, c.displayName, c.username, c.avatarUrl FROM c WHERE c.id = @uid',
            parameters: [{ name: '@uid', value: uid }]
          }).fetchAll();
          if (uList[0]) usersMap[uid] = uList[0];
        }
      }

      return apiPaginated(
        replies.map((r: any) => {
          const u = usersMap[r.userId] || r.user || { id: r.userId, displayName: 'User', username: null, avatarUrl: null };
          return {
            id: r.id,
            content: r.content,
            likeCount: r._count?.likes || 0,
            userLiked: userCommentLikes.has(r.id),
            createdAt: typeof r.createdAt === 'string' ? r.createdAt : r.createdAt?.toISOString(),
            updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : r.updatedAt?.toISOString(),
            user: {
              id: u.id,
              displayName: u.displayName || 'User',
              username: u.username || null,
              avatarUrl: u.avatarUrl || null,
            },
          };
        }),
        page,
        limit,
        total
      );

    } else {
      const parentComment = await db.comment.findUnique({
        where: { id },
        select: { id: true, status: true },
      });
      if (!parentComment) return apiError('COMMENT_NOT_FOUND');

      if (user.role !== 'ADMIN' && parentComment.status !== 'VISIBLE') {
        return apiError('COMMENT_NOT_FOUND');
      }

      const { searchParams } = new URL(request.url);
      const pagination = paginationSchema.parse(Object.fromEntries(searchParams));
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

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

      let userCommentLikes = new Set<string>();
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
    }
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CONSUMER' && user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const container = getContainer('comments');
    if (container) {
      const { resources: parentComments } = await container.items
        .query({ query: 'SELECT c.id, c.videoId, c.status FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();
      const parentComment = parentComments[0];
      if (!parentComment) return apiError('COMMENT_NOT_FOUND');

      if (user.role !== 'ADMIN' && parentComment.status !== 'VISIBLE') {
        return apiError('COMMENT_NOT_FOUND');
      }

      const body = await request.json();
      const parsed = commentSchema.safeParse(body);
      if (!parsed.success) {
        return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
      }

      const replyData = {
        id: uuidv4(),
        videoId: parentComment.videoId,
        userId: user.id,
        content: parsed.data.content,
        parentCommentId: id,
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

      await container.items.create(replyData);

      return apiCreated({
        id: replyData.id,
        content: replyData.content,
        status: replyData.status,
        parentCommentId: replyData.parentCommentId,
        createdAt: replyData.createdAt,
        updatedAt: replyData.updatedAt,
        user: replyData.user,
      });

    } else {
      const parentComment = await db.comment.findUnique({
        where: { id },
        select: { id: true, videoId: true, status: true },
      });
      if (!parentComment) return apiError('COMMENT_NOT_FOUND');
      if (user.role !== 'ADMIN' && parentComment.status !== 'VISIBLE') {
        return apiError('COMMENT_NOT_FOUND');
      }

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
    }
  } catch (error) {
    logger.error('Create reply failed', { error: (error as Error).message, parentCommentId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
