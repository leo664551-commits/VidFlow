import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/services/audit';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const targetUser = await db.user.findUnique({ where: { id } });
    if (!targetUser) return apiError('USER_NOT_FOUND');

    const body = await request.json();
    const newStatus = body.status;

    if (newStatus !== 'ACTIVE' && newStatus !== 'DISABLED') {
      return apiError('VALIDATION_ERROR', 'Status must be ACTIVE or DISABLED');
    }

    // Prevent disabling last admin
    if (newStatus === 'DISABLED' && targetUser.role === 'ADMIN') {
      const adminCount = await db.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
      if (adminCount <= 1) {
        return apiError('LAST_ADMIN');
      }
    }

    const updated = await db.user.update({
      where: { id },
      data: { status: newStatus },
    });

    await createAuditLog(user.id, 'USER_STATUS_CHANGED', 'User', id, {
      oldStatus: targetUser.status,
      newStatus,
    });
    logger.info('User status changed', { targetUserId: id, newStatus, adminId: user.id });

    return apiSuccess({
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
      status: updated.status,
    });
  } catch (error) {
    logger.error('Update user status failed', { error: (error as Error).message, userId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
