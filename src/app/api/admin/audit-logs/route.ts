import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiPaginated, apiError } from '@/lib/api-response';
import { paginationSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { searchParams } = new URL(request.url);
  const pagination = paginationSchema.parse(Object.fromEntries(searchParams));
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const action = searchParams.get('action') || undefined;
  const entityType = searchParams.get('entityType') || undefined;
  const search = searchParams.get('search') || undefined;

  const where: Record<string, unknown> = {};
  if (action && action !== 'ALL') where.action = action;
  if (entityType && entityType !== 'ALL') where.entityType = entityType;
  if (search) {
    where.OR = [
      { action: { contains: search } },
      { entityId: { contains: search } },
      { metadata: { contains: search } },
      { actor: { displayName: { contains: search } } },
      { actor: { email: { contains: search } } },
    ];
  }

  try {
    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    return apiPaginated(
      logs.map((log) => ({
        id: log.id,
        actorUserId: log.actorUserId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
        actor: log.actor,
      })),
      page,
      limit,
      total
    );
  } catch (error) {
    console.error('Error fetching admin audit logs:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
