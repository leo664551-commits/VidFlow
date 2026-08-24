import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiError } from '@/lib/api-response';
import { createNotification } from '@/services/notification';
import { v4 as uuidv4 } from 'uuid';

async function resolveTargetUserId(id: string): Promise<string | null> {
  const container = getContainer('creatorProfiles');
  if (container) {
    const { resources } = await container.items.query({
      query: 'SELECT * FROM c WHERE c.id = @id OR c.userId = @id',
      parameters: [{ name: '@id', value: id }]
    }).fetchAll();
    if (resources.length > 0) return resources[0].userId;

    const userContainer = getContainer('users');
    if (userContainer) {
      const { resources: users } = await userContainer.items.query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: id }]
      }).fetchAll();
      return users.length > 0 ? users[0].id : null;
    }
  }

  const creator = await db.creatorProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
    select: { userId: true },
  });
  if (creator) return creator.userId;

  const targetUser = await db.user.findUnique({
    where: { id },
    select: { id: true },
  });
  return targetUser ? targetUser.id : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  const { id } = await params;

  const targetUserId = await resolveTargetUserId(id);
  if (!targetUserId) return apiError('CREATOR_NOT_FOUND');

  try {
    const container = getContainer('follows');
    if (container) {
      const { resources: followingCountRes } = await container.items.query({
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.followingId = @userId',
        parameters: [{ name: '@userId', value: targetUserId }]
      }).fetchAll();
      
      const { resources: followerCountRes } = await container.items.query({
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.followerId = @userId',
        parameters: [{ name: '@userId', value: targetUserId }]
      }).fetchAll();

      const followingCount = followingCountRes[0] || 0;
      const followerCount = followerCountRes[0] || 0;

      let isFollowing = false;
      if (user) {
        const { resources } = await container.items.query({
          query: 'SELECT * FROM c WHERE c.followerId = @followerId AND c.followingId = @followingId',
          parameters: [
            { name: '@followerId', value: user.id },
            { name: '@followingId', value: targetUserId }
          ]
        }).fetchAll();
        isFollowing = resources.length > 0;
      }

      return apiSuccess({
        isFollowing,
        followerCount,
        followingCount,
      });
    } else {
      const [followerCount, followingCount] = await Promise.all([
        db.follow.count({ where: { followingId: targetUserId } }),
        db.follow.count({ where: { followerId: targetUserId } }),
      ]);

      let isFollowing = false;
      if (user) {
        const existing = await db.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: user.id,
              followingId: targetUserId,
            },
          },
        });
        isFollowing = !!existing;
      }

      return apiSuccess({
        isFollowing,
        followerCount,
        followingCount,
      });
    }
  } catch (err) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  const { id } = await params;

  const targetUserId = await resolveTargetUserId(id);
  if (!targetUserId) return apiError('CREATOR_NOT_FOUND');

  if (targetUserId === user.id) {
    return apiError('FORBIDDEN', 'You cannot follow yourself');
  }

  try {
    const container = getContainer('follows');
    if (container) {
      const { resources: existingRes } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.followerId = @followerId AND c.followingId = @followingId',
        parameters: [
          { name: '@followerId', value: user.id },
          { name: '@followingId', value: targetUserId }
        ]
      }).fetchAll();
      
      const existing = existingRes[0];
      let isFollowing = false;
      
      if (existing) {
        // Unfollow
        await container.item(existing.id, existing.followerId).delete();
        isFollowing = false;
      } else {
        // Follow
        await container.items.create({
          id: uuidv4(),
          followerId: user.id,
          followingId: targetUserId,
          createdAt: new Date().toISOString()
        });
        isFollowing = true;

        if (targetUserId !== user.id) {
          const actorName = user.displayName || user.username || 'Someone';
          await createNotification({
            userId: targetUserId,
            actorId: user.id,
            type: 'FOLLOW',
            title: 'New Follower',
            message: `${actorName} started following you`,
            entityType: 'User',
            entityId: user.id,
          });
        }
      }

      const { resources: followingCountRes } = await container.items.query({
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.followingId = @userId',
        parameters: [{ name: '@userId', value: targetUserId }]
      }).fetchAll();
      
      const { resources: followerCountRes } = await container.items.query({
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.followerId = @userId',
        parameters: [{ name: '@userId', value: targetUserId }]
      }).fetchAll();

      return apiSuccess({
        isFollowing,
        followerCount: followingCountRes[0] || 0,
        followingCount: followerCountRes[0] || 0,
      });
    } else {
      const existing = await db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: targetUserId,
          },
        },
      });

      let isFollowing = false;
      if (existing) {
        await db.follow.delete({
          where: { id: existing.id },
        });
        isFollowing = false;
      } else {
        await db.follow.create({
          data: {
            followerId: user.id,
            followingId: targetUserId,
          },
        });
        isFollowing = true;

        if (targetUserId !== user.id) {
          const actorName = user.displayName || user.username || 'Someone';
          await createNotification({
            userId: targetUserId,
            actorId: user.id,
            type: 'FOLLOW',
            title: 'New Follower',
            message: `${actorName} started following you`,
            entityType: 'User',
            entityId: user.id,
          });
        }
      }

      const [followerCount, followingCount] = await Promise.all([
        db.follow.count({ where: { followingId: targetUserId } }),
        db.follow.count({ where: { followerId: targetUserId } }),
      ]);

      return apiSuccess({
        isFollowing,
        followerCount,
        followingCount,
      });
    }
  } catch (err) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}