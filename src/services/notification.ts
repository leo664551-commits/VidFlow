import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface CreateNotificationParams {
  userId: string;
  actorId?: string | null;
  type:
    | 'LIKE_VIDEO'
    | 'LIKE_COMMENT'
    | 'COMMENT_REPLY'
    | 'VIDEO_COMMENT'
    | 'FOLLOW'
    | 'CREATOR_RATING'
    | 'NEW_VIDEO'
    | 'CREATOR_APPLICATION_APPROVED'
    | 'CREATOR_APPLICATION_REJECTED'
    | 'SYSTEM'
    | string;
  title?: string;
  message: string;
  entityType?: 'Video' | 'Comment' | 'CreatorProfile' | 'User' | string;
  entityId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const { userId, actorId, type, title, message, entityType, entityId } = params;

  // Don't notify oneself
  if (actorId && userId === actorId) {
    return null;
  }

  try {
    const notification = await db.notification.create({
      data: {
        userId,
        actorId: actorId ?? null,
        type,
        title: title ?? null,
        message,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
      },
    });
    return notification;
  } catch (error) {
    logger.error('Failed to create notification', { error: (error as Error).message, userId, type });
    return null;
  }
}
