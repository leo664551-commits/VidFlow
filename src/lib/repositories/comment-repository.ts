import { getContainer } from '@/lib/cosmos';
import { db } from '@/lib/db';
import type { CommentStatus, CommentWithUser } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface CosmosComment {
  id: string;
  videoId: string;
  userId: string;
  parentCommentId: string | null;
  content: string;
  status: CommentStatus;
  likeCount: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  };
}

export async function getCommentsForVideo(
  videoId: string,
  params?: { page?: number; limit?: number; currentUserId?: string }
): Promise<{ data: CommentWithUser[]; total: number; totalPages: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const offset = (page - 1) * limit;

  const container = getContainer('comments');
  if (!container) {
    const where = {
      videoId,
      parentCommentId: null,
      status: 'VISIBLE' as const,
    };
    const [comments, total] = await Promise.all([
      db.comment.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
          _count: { select: { replies: true, likes: true } },
          likes: params?.currentUserId
            ? { where: { userId: params.currentUserId }, select: { id: true } }
            : false,
        },
      }),
      db.comment.count({ where }),
    ]);

    const data: CommentWithUser[] = comments.map((c) => ({
      id: c.id,
      videoId: c.videoId,
      parentCommentId: c.parentCommentId,
      content: c.content,
      status: c.status as CommentStatus,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      user: {
        id: c.user.id,
        displayName: c.user.displayName,
        username: c.user.username,
        avatarUrl: c.user.avatarUrl,
      },
      replyCount: c._count.replies,
      likeCount: c._count.likes,
      userLiked: Array.isArray(c.likes) && c.likes.length > 0,
    }));

    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  const query = 'SELECT * FROM c WHERE c.videoId = @videoId AND IS_NULL(c.parentCommentId) AND c.status = "VISIBLE" ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit';
  const countQuery = 'SELECT VALUE COUNT(1) FROM c WHERE c.videoId = @videoId AND IS_NULL(c.parentCommentId) AND c.status = "VISIBLE"';
  const parameters = [
    { name: '@videoId', value: videoId },
    { name: '@offset', value: offset },
    { name: '@limit', value: limit },
  ];

  const [{ resources }, { resources: countRes }] = await Promise.all([
    container.items.query<CosmosComment>({ query, parameters }).fetchAll(),
    container.items.query<number>({ query: countQuery, parameters: [{ name: '@videoId', value: videoId }] }).fetchAll(),
  ]);

  const total = countRes[0] || 0;
  const data: CommentWithUser[] = resources.map((c) => ({
    ...c,
    userLiked: false,
  }));

  return {
    data,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function createComment(data: {
  videoId: string;
  userId: string;
  content: string;
  parentCommentId?: string | null;
  user: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  };
}): Promise<CosmosComment> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const newComment: CosmosComment = {
    id,
    videoId: data.videoId,
    userId: data.userId,
    content: data.content,
    parentCommentId: data.parentCommentId || null,
    status: 'VISIBLE',
    likeCount: 0,
    replyCount: 0,
    createdAt: now,
    updatedAt: now,
    user: data.user,
  };

  const container = getContainer('comments');
  if (!container) {
    const comment = await db.comment.create({
      data: {
        id: newComment.id,
        videoId: newComment.videoId,
        userId: newComment.userId,
        parentCommentId: newComment.parentCommentId,
        content: newComment.content,
        status: newComment.status,
      },
      include: {
        user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      },
    });
    return {
      ...newComment,
      id: comment.id,
      user: comment.user,
    };
  }

  const { resource } = await container.items.create(newComment);
  return resource!;
}
