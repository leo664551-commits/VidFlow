import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiError } from '@/lib/api-response';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionUser = await getSession(request);

  try {
    let targetUserId = id;

    const creatorProfiles = getContainer('creatorProfiles');
    if (creatorProfiles) {
      const { resources } = await creatorProfiles.items.query({
        query: 'SELECT * FROM c WHERE c.id = @id OR c.userId = @id',
        parameters: [{ name: '@id', value: id }]
      }).fetchAll();
      if (resources.length > 0) {
        targetUserId = resources[0].userId;
      }
    } else {
      const creator = await db.creatorProfile.findFirst({
        where: { OR: [{ id }, { userId: id }] },
        select: { userId: true },
      });
      targetUserId = creator?.userId || id;
    }

    const users = getContainer('users');
    let userExists = false;
    if (users) {
      const { resources } = await users.items.query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: targetUserId }]
      }).fetchAll();
      userExists = resources.length > 0;
    } else {
      const existing = await db.user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });
      userExists = !!existing;
    }

    if (!userExists) {
      return apiError('NOT_FOUND', 'Target profile not found');
    }

    if (sessionUser && sessionUser.id === targetUserId) {
      return apiSuccess({ recorded: false, isSelf: true });
    }

    const container = getContainer('profileViews');
    if (container) {
      if (sessionUser) {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { resources } = await container.items.query({
          query: 'SELECT * FROM c WHERE c.profileUserId = @profileUserId AND c.viewerUserId = @viewerUserId AND c.createdAt >= @time',
          parameters: [
            { name: '@profileUserId', value: targetUserId },
            { name: '@viewerUserId', value: sessionUser.id },
            { name: '@time', value: fifteenMinutesAgo }
          ]
        }).fetchAll();

        if (resources.length > 0) {
          return apiSuccess({ recorded: true, deduped: true });
        }
      }

      const viewId = uuidv4();
      await container.items.create({
        id: viewId,
        profileUserId: targetUserId,
        viewerUserId: sessionUser?.id || null,
        createdAt: new Date().toISOString()
      });

      return apiSuccess({
        recorded: true,
        id: viewId,
      });
    } else {
      if (sessionUser) {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const recentView = await db.profileView.findFirst({
          where: {
            profileUserId: targetUserId,
            viewerUserId: sessionUser.id,
            viewedAt: { gte: fifteenMinutesAgo },
          },
        });

        if (recentView) {
          return apiSuccess({ recorded: true, deduped: true });
        }
      }

      const viewRecord = await db.profileView.create({
        data: {
          profileUserId: targetUserId,
          viewerUserId: sessionUser?.id || null,
        },
      });

      return apiSuccess({
        recorded: true,
        id: viewRecord.id,
      });
    }
  } catch (err) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
