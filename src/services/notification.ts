import { createNotification as createRepoNotification } from '@/lib/repositories/notification-repository';

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
  return createRepoNotification(params);
}
