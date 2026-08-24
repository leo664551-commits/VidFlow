import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/services/audit';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const container = getContainer('users');
    if (container) {
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: id }],
        })
        .fetchAll();
        
      const targetUser = resources[0];
      if (!targetUser) return apiError('USER_NOT_FOUND');

      const body = await request.json();
      const newStatus = body.status;

      if (newStatus !== 'ACTIVE' && newStatus !== 'DISABLED') {
        return apiError('VALIDATION_ERROR', 'Status must be ACTIVE or DISABLED');
      }

      // Prevent disabling last admin
      if (newStatus === 'DISABLED' && targetUser.role === 'ADMIN') {
        const { resources: countResult } = await container.items
          .query({ query: "SELECT VALUE COUNT(1) FROM c WHERE c.role = 'ADMIN' AND c.status = 'ACTIVE'" })
          .fetchAll();
        const adminCount = countResult[0] || 0;
        if (adminCount <= 1) {
          return apiError('LAST_ADMIN');
        }
      }

      const item = container.item(id, id);
      const { resource } = await item.read();
      await item.replace({ ...resource, status: newStatus, updatedAt: new Date().toISOString() });

      await createAuditLog(user.id, 'USER_STATUS_CHANGED', 'User', id, {
        oldStatus: targetUser.status,
        newStatus,
      });
      logger.info('User status changed', { targetUserId: id, newStatus, adminId: user.id });

      return apiSuccess({
        id: targetUser.id,
        email: targetUser.email,
        displayName: targetUser.displayName,
        role: targetUser.role,
        status: newStatus,
      });
    } else {
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
    }
  } catch (error) {
    logger.error('Update user status failed', { error: (error as Error).message, userId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
