import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
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

  try {
    const container = getContainer('auditLogs');
    if (container) {
      const usersContainer = getContainer('users');
      let logsList: Array<Record<string, any>> = [];
      let total = 0;

      if (search) {
        // Fetch all matching action and entityType then filter in JS due to complexity
        let queryStr = 'SELECT * FROM c WHERE 1=1';
        let parameters: any[] = [];
        let paramCount = 0;

        if (action && action !== 'ALL') {
          queryStr += ` AND c.action = @param${paramCount}`;
          parameters.push({ name: `@param${paramCount}`, value: action });
          paramCount++;
        }
        if (entityType && entityType !== 'ALL') {
          queryStr += ` AND c.entityType = @param${paramCount}`;
          parameters.push({ name: `@param${paramCount}`, value: entityType });
          paramCount++;
        }
        
        const { resources: allLogs } = await container.items.query<Record<string, any>>({ query: queryStr, parameters }).fetchAll();
        const { resources: allUsers } = usersContainer ? await usersContainer.items.query<Record<string, any>>('SELECT * FROM c').fetchAll() : { resources: [] };

        let joinedLogs: Array<Record<string, any>> = allLogs.map(log => {
          const actor = allUsers.find(u => u.id === log.actorUserId);
          return { ...log, actor };
        });

        joinedLogs = joinedLogs.filter(log => {
          const s = search.toLowerCase();
          return log.action?.toLowerCase().includes(s) ||
                 log.entityId?.toLowerCase().includes(s) ||
                 (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(s)) ||
                 log.actor?.displayName?.toLowerCase().includes(s) ||
                 log.actor?.email?.toLowerCase().includes(s);
        });

        joinedLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        total = joinedLogs.length;
        const pageLogs = joinedLogs.slice(skip, skip + limit);

        logsList = pageLogs.map(log => ({
          id: log.id,
          actorUserId: log.actorUserId,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          metadata: log.metadata,
          createdAt: log.createdAt,
          actor: log.actor ? {
            id: log.actor.id,
            email: log.actor.email,
            displayName: log.actor.displayName,
            role: log.actor.role,
            avatarUrl: log.actor.avatarUrl,
          } : null,
        }));

      } else {
        let queryStr = 'SELECT * FROM c WHERE 1=1';
        let parameters: any[] = [];
        let paramCount = 0;

        if (action && action !== 'ALL') {
          queryStr += ` AND c.action = @param${paramCount}`;
          parameters.push({ name: `@param${paramCount}`, value: action });
          paramCount++;
        }
        if (entityType && entityType !== 'ALL') {
          queryStr += ` AND c.entityType = @param${paramCount}`;
          parameters.push({ name: `@param${paramCount}`, value: entityType });
          paramCount++;
        }

        const countQuery = queryStr.replace('SELECT * FROM c', 'SELECT VALUE COUNT(1) FROM c');
        const { resources: countRes } = await container.items.query<number>({ query: countQuery, parameters }).fetchAll();
        total = countRes[0] || 0;

        const pageQuery = queryStr + ` ORDER BY c.createdAt DESC OFFSET ${skip} LIMIT ${limit}`;
        const { resources: pageLogs } = await container.items.query<Record<string, any>>({ query: pageQuery, parameters }).fetchAll();

        for (const log of pageLogs) {
          let actor: Record<string, any> | null = null;
          if (usersContainer) {
            const { resources } = await usersContainer.items.query<Record<string, any>>({
              query: 'SELECT * FROM c WHERE c.id = @userId',
              parameters: [{ name: '@userId', value: log.actorUserId }]
            }).fetchAll();
            if (resources.length > 0) {
              const u = resources[0];
              actor = {
                id: u.id,
                email: u.email,
                displayName: u.displayName,
                role: u.role,
                avatarUrl: u.avatarUrl,
              };
            }
          }

          logsList.push({
            id: log.id,
            actorUserId: log.actorUserId,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            metadata: log.metadata,
            createdAt: log.createdAt,
            actor,
          });
        }
      }

      return apiPaginated(logsList, page, limit, total);
      
    } else {
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
    }
  } catch (error) {
    console.error('Error fetching admin audit logs:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
