import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiError } from '@/lib/api-response';

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
  const currentUser = await getSession(request);
  const { id } = await params;

  const targetUserId = await resolveTargetUserId(id);
  if (!targetUserId) return apiError('CREATOR_NOT_FOUND');

  try {
    const container = getContainer('follows');
    if (container) {
      const { resources: follows } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.followerId = @userId ORDER BY c.createdAt DESC',
        parameters: [{ name: '@userId', value: targetUserId }]
      }).fetchAll();

      let currentUserFollowingSet = new Set<string>();
      if (currentUser && follows.length > 0) {
        const followingUserIds = follows.map((f) => f.followingId);
        const { resources: myFollows } = await container.items.query({
          query: 'SELECT c.followingId FROM c WHERE c.followerId = @myId',
          parameters: [{ name: '@myId', value: currentUser.id }]
        }).fetchAll();
        const myFollowingIds = new Set(myFollows.map(f => f.followingId));
        followingUserIds.forEach(fid => {
          if (myFollowingIds.has(fid)) currentUserFollowingSet.add(fid);
        });
      }

      const usersContainer = getContainer('users');
      const creatorsContainer = getContainer('creatorProfiles');
      
      const items = await Promise.all(follows.map(async (f) => {
        let user: Record<string, any> | null = null;
        if (usersContainer) {
          const { resources } = await usersContainer.items.query<Record<string, any>>({
            query: 'SELECT * FROM c WHERE c.id = @id',
            parameters: [{ name: '@id', value: f.followingId }]
          }).fetchAll();
          user = resources[0] || null;
        }

        let creatorProfile: Record<string, any> | null = null;
        if (creatorsContainer) {
          const { resources } = await creatorsContainer.items.query<Record<string, any>>({
            query: 'SELECT c.id, c.creatorName FROM c WHERE c.userId = @id',
            parameters: [{ name: '@id', value: f.followingId }]
          }).fetchAll();
          creatorProfile = resources[0] || null;
        }

        const u = user || { id: f.followingId, displayName: 'User' };

        return {
          id: u.id,
          displayName: u.displayName || u.username || 'User',
          username: u.username || null,
          avatarUrl: u.avatarUrl || null,
          role: u.role,
          bio: u.bio || null,
          creatorProfileId: creatorProfile?.id || null,
          creatorName: creatorProfile?.creatorName || null,
          isFollowing: currentUser ? currentUserFollowingSet.has(u.id) : false,
          isSelf: currentUser ? currentUser.id === u.id : false,
          followedAt: f.createdAt,
        };
      }));

      return apiSuccess({
        total: items.length,
        data: items,
      });

    } else {
      const follows = await db.follow.findMany({
        where: { followerId: targetUserId },
        include: {
          following: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
              role: true,
              bio: true,
              creatorProfile: { select: { id: true, creatorName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      let currentUserFollowingSet = new Set<string>();
      if (currentUser) {
        const followingUserIds = follows.map((f) => f.following.id);
        const myFollows = await db.follow.findMany({
          where: {
            followerId: currentUser.id,
            followingId: { in: followingUserIds },
          },
          select: { followingId: true },
        });
        currentUserFollowingSet = new Set(myFollows.map((f) => f.followingId));
      }

      const items = follows.map((f) => ({
        id: f.following.id,
        displayName: f.following.displayName || f.following.username || 'User',
        username: f.following.username || null,
        avatarUrl: f.following.avatarUrl || null,
        role: f.following.role,
        bio: f.following.bio || null,
        creatorProfileId: f.following.creatorProfile?.id || null,
        creatorName: f.following.creatorProfile?.creatorName || null,
        isFollowing: currentUser ? currentUserFollowingSet.has(f.following.id) : false,
        isSelf: currentUser ? currentUser.id === f.following.id : false,
        followedAt: f.createdAt.toISOString(),
      }));

      return apiSuccess({
        total: items.length,
        data: items,
      });
    }
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
