import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiPaginated, apiCreated, apiError } from '@/lib/api-response';
import { paginationSchema, createCreatorSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/services/audit';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { searchParams } = new URL(request.url);
  const pagination = paginationSchema.parse(Object.fromEntries(searchParams));
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;
  const search = searchParams.get('search') || undefined;

  try {
    const container = getContainer('creatorProfiles');
    if (container) {
      const usersContainer = getContainer('users');
      let creators: Array<Record<string, any>> = [];
      let total = 0;

      if (search) {
        // Fetch all and filter in JS
        const { resources: allProfiles } = await container.items.query<Record<string, any>>('SELECT * FROM c').fetchAll();
        const { resources: allUsers } = usersContainer ? await usersContainer.items.query<Record<string, any>>('SELECT * FROM c').fetchAll() : { resources: [] };
        
        let joined: Array<Record<string, any>> = allProfiles.map(p => ({
          ...p,
          user: allUsers.find(u => u.id === p.userId)
        })).filter(p => p.user);

        joined = joined.filter(p => {
          const s = search.toLowerCase();
          return p.user?.displayName?.toLowerCase().includes(s) || 
                 p.user?.email?.toLowerCase().includes(s) || 
                 p.creatorName?.toLowerCase().includes(s);
        });

        joined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        total = joined.length;
        creators = joined.slice(skip, skip + limit);
      } else {
        const { resources: countRes } = await container.items.query('SELECT VALUE COUNT(1) FROM c').fetchAll();
        total = countRes[0] || 0;

        const { resources: pageProfiles } = await container.items.query(`
          SELECT * FROM c ORDER BY c.createdAt DESC OFFSET ${skip} LIMIT ${limit}
        `).fetchAll();

        const userIds = pageProfiles.map(p => p.userId);
        let usersMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const userParams = userIds.map((id, i) => `@id${i}`);
          const inClause = userParams.join(', ');
          const parameters = userIds.map((id, i) => ({ name: `@id${i}`, value: id }));
          const { resources: fetchedUsers } = await usersContainer!.items.query({
            query: `SELECT * FROM c WHERE c.id IN (${inClause})`,
            parameters
          }).fetchAll();
          
          for (const u of fetchedUsers) {
            usersMap[u.id] = u;
          }
        }

        creators = pageProfiles.map(p => ({
          ...p,
          user: usersMap[p.userId]
        })).filter(p => p.user);
      }

      return apiPaginated(
        creators.map((c: any) => ({
          id: c.id,
          userId: c.userId,
          creatorName: c.creatorName,
          description: c.description,
          videoCount: 0,
          user: {
            id: c.user.id,
            email: c.user.email,
            username: c.user.username,
            displayName: c.user.displayName,
            avatarUrl: c.user.avatarUrl,
            status: c.user.status,
          },
          createdAt: c.createdAt,
        })),
        page,
        limit,
        total
      );
    } else {
      const where: Record<string, unknown> = {};
      if (search) {
        where.OR = [
          { user: { displayName: { contains: search } } },
          { user: { email: { contains: search } } },
          { creatorName: { contains: search } },
        ];
      }
      const [creators, total] = await Promise.all([
        db.creatorProfile.findMany({
          where,
          include: {
            user: { select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, status: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.creatorProfile.count({ where }),
      ]);

      return apiPaginated(
        creators.map((c) => ({
          id: c.id,
          userId: c.userId,
          creatorName: c.creatorName,
          description: c.description,
          videoCount: 0, // will be populated separately if needed
          user: c.user,
          createdAt: c.createdAt.toISOString(),
        })),
        page,
        limit,
        total
      );
    }
  } catch (error) {
    logger.error('Error fetching creators', { error });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function POST(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  try {
    const container = getContainer('creatorProfiles');
    if (container) {
      const body = await request.json();
      const parsed = createCreatorSchema.safeParse(body);
      if (!parsed.success) {
        return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
      }

      const { email, displayName, creatorName, password, description } = parsed.data;

      const usersContainer = getContainer('users');
      if (!usersContainer) return apiError('INTERNAL_SERVER_ERROR');

      const { resources: existingUsers } = await usersContainer.items.query({
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: email }]
      }).fetchAll();
      
      if (existingUsers.length > 0) return apiError('EMAIL_EXISTS');

      const hashedPassword = await hashPassword(password);
      const newUserId = uuidv4();
      const newProfileId = uuidv4();

      await usersContainer.items.create({
        id: newUserId,
        email,
        displayName,
        password: hashedPassword,
        role: 'CREATOR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await container.items.create({
        id: newProfileId,
        userId: newUserId,
        creatorName,
        description: description ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await createAuditLog(user.id, 'CREATOR_CREATED', 'CreatorProfile', newProfileId, {
        creatorName,
        email,
      });
      logger.info('Creator created by admin', { creatorId: newProfileId, adminId: user.id });

      return apiCreated({
        id: newUserId,
        email,
        displayName,
        role: 'CREATOR',
        creatorProfile: {
          id: newProfileId,
          creatorName,
          description: description ?? null,
        },
      });

    } else {
      const body = await request.json();
      const parsed = createCreatorSchema.safeParse(body);
      if (!parsed.success) {
        return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
      }

      const { email, displayName, creatorName, password, description } = parsed.data;

      // Check email exists
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) return apiError('EMAIL_EXISTS');

      const hashedPassword = await hashPassword(password);

      const result = await db.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            displayName,
            password: hashedPassword,
            role: 'CREATOR',
          },
        });

        const profile = await tx.creatorProfile.create({
          data: {
            userId: newUser.id,
            creatorName,
            description: description ?? null,
          },
        });

        return { user: newUser, profile };
      });

      await createAuditLog(user.id, 'CREATOR_CREATED', 'CreatorProfile', result.profile.id, {
        creatorName,
        email,
      });
      logger.info('Creator created by admin', { creatorId: result.profile.id, adminId: user.id });

      return apiCreated({
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        role: result.user.role,
        creatorProfile: {
          id: result.profile.id,
          creatorName: result.profile.creatorName,
          description: result.profile.description,
        },
      });
    }
  } catch (error) {
    logger.error('Create creator failed', { error: (error as Error).message });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
