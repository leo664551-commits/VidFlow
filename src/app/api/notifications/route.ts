import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
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
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  try {
    const now = new Date();
    await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true, readAt: now },
    });

    return apiSuccess({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
