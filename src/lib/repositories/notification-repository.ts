import { getContainer } from '@/lib/cosmos';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export interface CosmosNotification {
  id: string;
  userId: string;
  actorId?: string | null;
  type: string;
  title?: string | null;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

export async function createNotification(params: {
  userId: string;
  actorId?: string | null;
  type: string;
  title?: string;
  message: string;
  entityType?: string;
  entityId?: string;
}) {
  const { userId, actorId, type, title, message, entityType, entityId } = params;

  if (actorId && userId === actorId) {
    return null;
  }

  const container = getContainer('notifications');
  if (!container) {
    try {
      return await db.notification.create({
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
    } catch (error) {
      logger.error('Failed to create notification in DB', { error: (error as Error).message });
      return null;
    }
  }

  const newNotification: CosmosNotification = {
    id: uuidv4(),
    userId,
    actorId: actorId ?? null,
    type,
    title: title ?? null,
    message,
    entityType: entityType ?? null,
    entityId: entityId ?? null,
    read: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  };

  const { resource } = await container.items.create(newNotification);
  return resource;
}
