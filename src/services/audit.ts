import { createAuditLog as createRepoAuditLog } from '@/lib/repositories/audit-repository';

export async function createAuditLog(
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  return createRepoAuditLog(actorUserId, action, entityType, entityId, metadata);
}
