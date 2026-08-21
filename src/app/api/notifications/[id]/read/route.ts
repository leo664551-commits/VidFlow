import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  const { id } = await params;

  try {
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
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
