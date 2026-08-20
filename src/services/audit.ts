import { db } from '@/lib/db';

export async function createAuditLog(
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  await db.auditLog.create({
    data: {
      actorUserId,
      action,
      entityType,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
