import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  const { id } = await params;

  try {
    const container = getContainer('notifications');
    if (container) {
      const { resources } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: id }]
      }).fetchAll();

      if (resources.length === 0 || resources[0].userId !== user.id) {
        return apiError('NOT_FOUND', 'Notification not found');
      }

      const notification = resources[0];
      const now = new Date().toISOString();
      const updated = { ...notification, read: true, readAt: now };

      await container.item(id, notification.userId).replace(updated);

      return apiSuccess({
        id: updated.id,
        read: updated.read,
        readAt: updated.readAt,
      });
    } else {
      const notification = await db.notification.findUnique({
        where: { id },
      });

      if (!notification || notification.userId !== user.id) {
        return apiError('NOT_FOUND', 'Notification not found');
      }

      const updated = await db.notification.update({
        where: { id },
        data: { read: true, readAt: new Date() },
      });

      return apiSuccess({
        id: updated.id,
        read: updated.read,
        readAt: updated.readAt?.toISOString(),
      });
    }
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
