import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiPaginated, apiSuccess, apiError } from '@/lib/api-response';
import { paginationSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED', 'Please log in to view notifications');

  const { searchParams } = new URL(request.url);
  const pagination = paginationSchema.parse(Object.fromEntries(searchParams));
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  try {
    const container = getContainer('notifications');
    if (container) {
      const { resources: notifications } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC OFFSET @skip LIMIT @limit',
        parameters: [
          { name: '@userId', value: user.id },
          { name: '@skip', value: skip },
          { name: '@limit', value: limit }
        ]
      }).fetchAll();

      const { resources: countRes } = await container.items.query({
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: user.id }]
      }).fetchAll();
      const total = countRes[0] || 0;

      const { resources: unreadRes } = await container.items.query({
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.userId = @userId AND c.read = false',
        parameters: [{ name: '@userId', value: user.id }]
      }).fetchAll();
      const unreadCount = unreadRes[0] || 0;

      const usersContainer = getContainer('users');

      const formatted = await Promise.all(notifications.map(async (n) => {
        let actor: Record<string, any> | null = null;
        if (usersContainer && n.actorId) {
          const { resources } = await usersContainer.items.query<Record<string, any>>({
            query: 'SELECT c.id, c.displayName, c.username, c.avatarUrl FROM c WHERE c.id = @actorId',
            parameters: [{ name: '@actorId', value: n.actorId }]
          }).fetchAll();
          actor = resources[0] || null;
        }

        return {
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          entityType: n.entityType,
          entityId: n.entityId,
          read: n.read,
          readAt: n.readAt,
          createdAt: n.createdAt,
          actor: actor ? {
            id: actor.id,
            displayName: actor.displayName,
            username: actor.username || null,
            avatarUrl: actor.avatarUrl || null,
          } : null,
        };
      }));

      return apiSuccess({
        data: formatted,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      });
    } else {
      const [notifications, total, unreadCount] = await Promise.all([
        db.notification.findMany({
          where: { userId: user.id },
          include: {
            actor: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.notification.count({ where: { userId: user.id } }),
        db.notification.count({ where: { userId: user.id, read: false } }),
      ]);

      const formatted = notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        entityType: n.entityType,
        entityId: n.entityId,
        read: n.read,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
        actor: n.actor
          ? {
              id: n.actor.id,
              displayName: n.actor.displayName,
              username: n.actor.username || null,
              avatarUrl: n.actor.avatarUrl || null,
            }
          : null,
      }));

      return apiSuccess({
        data: formatted,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      });
    }
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  try {
    const container = getContainer('notifications');
    if (container) {
      const { resources: unreadNotifications } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.userId = @userId AND c.read = false',
        parameters: [{ name: '@userId', value: user.id }]
      }).fetchAll();

      const now = new Date().toISOString();
      await Promise.all(unreadNotifications.map(async (n) => {
        const item = container.item(n.id, n.userId);
        await item.replace({ ...n, read: true, readAt: now });
      }));

      return apiSuccess({ success: true, message: 'All notifications marked as read' });
    } else {
      const now = new Date();
      await db.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true, readAt: now },
      });

      return apiSuccess({ success: true, message: 'All notifications marked as read' });
    }
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
