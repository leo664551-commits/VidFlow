import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiPaginated, apiCreated, apiError } from '@/lib/api-response';
import { paginationSchema, createCreatorSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/services/audit';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { searchParams } = new URL(request.url);
  const pagination = paginationSchema.parse(Object.fromEntries(searchParams));
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;
  const search = searchParams.get('search') || undefined;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { user: { displayName: { contains: search } } },
      { user: { email: { contains: search } } },
      { creatorName: { contains: search } },
    ];
  }

  try {
    const [creators, total] = await Promise.all([
      db.creatorProfile.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, displayName: true, status: true } },
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
  } catch {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function POST(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  try {
    const body = await request.json();
    const parsed = createCreatorSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors[0].message);
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
  } catch (error) {
    logger.error('Create creator failed', { error: (error as Error).message });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
