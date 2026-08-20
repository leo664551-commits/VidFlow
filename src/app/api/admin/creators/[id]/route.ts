import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiNoContent, apiError } from '@/lib/api-response';
import { updateCreatorSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/services/audit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const profile = await db.creatorProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, displayName: true, role: true, status: true, createdAt: true } },
        videos: {
          select: { id: true, title: true, status: true, viewCount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!profile) return apiError('CREATOR_NOT_FOUND');

    const videoCount = await db.video.count({ where: { creatorId: profile.userId } });
    const totalViews = await db.video.aggregate({
      where: { creatorId: profile.userId },
      _sum: { viewCount: true },
    });

    return apiSuccess({
      ...profile,
      videoCount,
      totalViews: totalViews._sum.viewCount || 0,
      user: {
        ...profile.user,
        createdAt: profile.user.createdAt.toISOString(),
      },
      videos: profile.videos.map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
      })),
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    });
  } catch {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const profile = await db.creatorProfile.findUnique({ where: { id } });
    if (!profile) return apiError('CREATOR_NOT_FOUND');

    const body = await request.json();
    const parsed = updateCreatorSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
    }

    const { displayName, creatorName, description } = parsed.data;

    await db.$transaction(async (tx) => {
      if (displayName || creatorName) {
        await tx.creatorProfile.update({
          where: { id },
          data: {
            ...(creatorName ? { creatorName } : {}),
            ...(description !== undefined ? { description } : {}),
          },
        });
      }

      if (displayName) {
        await tx.user.update({
          where: { id: profile.userId },
          data: { displayName },
        });
      }
    });

    await createAuditLog(user.id, 'CREATOR_UPDATED', 'CreatorProfile', id, parsed.data);

    return apiSuccess({ success: true });
  } catch (error) {
    logger.error('Update creator failed', { error: (error as Error).message, creatorId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const profile = await db.creatorProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!profile) return apiError('CREATOR_NOT_FOUND');

    // Disable user and unpublish their videos
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: profile.userId },
        data: { status: 'DISABLED' },
      });

      await tx.video.updateMany({
        where: { creatorId: profile.userId, status: 'READY' },
        data: { status: 'UNPUBLISHED' },
      });
    });

    await createAuditLog(user.id, 'CREATOR_DISABLED', 'CreatorProfile', id, {
      userId: profile.userId,
      email: profile.user.email,
    });
    logger.info('Creator disabled by admin', { creatorId: id, adminId: user.id });

    return apiSuccess({ success: true });
  } catch (error) {
    logger.error('Disable creator failed', { error: (error as Error).message, creatorId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
