import { getContainer } from '@/lib/cosmos';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export interface CosmosAuditLog {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: string | null;
  createdAt: string;
}

export async function createAuditLog(
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  const container = getContainer('auditLogs');
  if (!container) {
    await db.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
    return;
  }

  const log: CosmosAuditLog = {
    id: uuidv4(),
    actorUserId,
    action,
    entityType,
    entityId,
    metadata: metadata ? JSON.stringify(metadata) : null,
    createdAt: new Date().toISOString(),
  };

  await container.items.create(log);
}
