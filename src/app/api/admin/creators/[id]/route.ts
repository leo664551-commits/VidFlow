import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
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
    const container = getContainer('creatorProfiles');
    if (container) {
      const { resources: profiles } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: id }]
      }).fetchAll();
      
      const profile = profiles[0];
      if (!profile) return apiError('CREATOR_NOT_FOUND');

      const usersContainer = getContainer('users');
      let profileUser: Record<string, any> | null = null;
      if (usersContainer) {
        const { resources } = await usersContainer.items.query<Record<string, any>>({
          query: 'SELECT * FROM c WHERE c.id = @userId',
          parameters: [{ name: '@userId', value: profile.userId }]
        }).fetchAll();
        profileUser = resources[0] || null;
      }

      const videosContainer = getContainer('videos');
      let videos: Array<Record<string, any>> = [];
      let videoCount = 0;
      let totalViews = 0;
      
      if (videosContainer) {
        const { resources: allVideos } = await videosContainer.items.query<Record<string, any>>({
          query: 'SELECT * FROM c WHERE c.creatorId = @creatorId ORDER BY c.createdAt DESC',
          parameters: [{ name: '@creatorId', value: profile.userId }]
        }).fetchAll();
        
        videoCount = allVideos.length;
        totalViews = allVideos.reduce((acc, v) => acc + (v.viewCount || 0), 0);
        
        videos = allVideos.slice(0, 10).map(v => ({
          id: v.id,
          title: v.title,
          status: v.status,
          viewCount: v.viewCount || 0,
          createdAt: v.createdAt
        }));
      }

      return apiSuccess({
        ...profile,
        videoCount,
        totalViews,
        user: profileUser ? {
          id: profileUser.id,
          email: profileUser.email,
          displayName: profileUser.displayName,
          role: profileUser.role,
          status: profileUser.status,
          createdAt: profileUser.createdAt,
        } : null,
        videos,
      });

    } else {
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
    }
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
    const container = getContainer('creatorProfiles');
    if (container) {
      const { resources: profiles } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: id }]
      }).fetchAll();
      
      const profile = profiles[0];
      if (!profile) return apiError('CREATOR_NOT_FOUND');

      const body = await request.json();
      const parsed = updateCreatorSchema.safeParse(body);
      if (!parsed.success) {
        return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
      }

      const { displayName, creatorName, description } = parsed.data;

      if (displayName || creatorName) {
        const item = container.item(id, profile.userId);
        const { resource } = await item.read();
        await item.replace({
          ...resource,
          ...(creatorName ? { creatorName } : {}),
          ...(description !== undefined ? { description } : {}),
          updatedAt: new Date().toISOString()
        });
      }

      if (displayName) {
        const usersContainer = getContainer('users');
        if (usersContainer) {
          const item = usersContainer.item(profile.userId, profile.userId);
          const { resource } = await item.read();
          if (resource) {
            await item.replace({ ...resource, displayName, updatedAt: new Date().toISOString() });
          }
        }
      }

      await createAuditLog(user.id, 'CREATOR_UPDATED', 'CreatorProfile', id, parsed.data);

      return apiSuccess({ success: true });
    } else {
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
    }
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
    const container = getContainer('creatorProfiles');
    if (container) {
      const { resources: profiles } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: id }]
      }).fetchAll();
      
      const profile = profiles[0];
      if (!profile) return apiError('CREATOR_NOT_FOUND');

      const usersContainer = getContainer('users');
      let profileUser: Record<string, any> | null = null;
      if (usersContainer) {
        const item = usersContainer.item(profile.userId, profile.userId);
        const { resource } = await item.read<Record<string, any>>();
        if (resource) {
          profileUser = resource;
          await item.replace({ ...resource, status: 'DISABLED', updatedAt: new Date().toISOString() });
        }
      }

      const videosContainer = getContainer('videos');
      if (videosContainer) {
        const { resources: videos } = await videosContainer.items.query<Record<string, any>>({
          query: 'SELECT * FROM c WHERE c.creatorId = @creatorId AND c.status = "READY"',
          parameters: [{ name: '@creatorId', value: profile.userId }]
        }).fetchAll();
        
        for (const v of videos) {
          const vItem = videosContainer.item(v.id, v.genre);
          const { resource } = await vItem.read();
          await vItem.replace({ ...resource, status: 'UNPUBLISHED', updatedAt: new Date().toISOString() });
        }
      }

      await createAuditLog(user.id, 'CREATOR_DISABLED', 'CreatorProfile', id, {
        userId: profile.userId,
        email: profileUser ? profileUser.email : 'Unknown',
      });
      logger.info('Creator disabled by admin', { creatorId: id, adminId: user.id });

      return apiSuccess({ success: true });
    } else {
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
    }
  } catch (error) {
    logger.error('Disable creator failed', { error: (error as Error).message, creatorId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
