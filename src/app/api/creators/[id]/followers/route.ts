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
        query: 'SELECT * FROM c WHERE c.followingId = @userId ORDER BY c.createdAt DESC',
        parameters: [{ name: '@userId', value: targetUserId }]
      }).fetchAll();

      let currentUserFollowingSet = new Set<string>();
      if (currentUser && follows.length > 0) {
        const followerUserIds = follows.map((f) => f.followerId);
        // Workaround for IN clause in Cosmos DB JS SDK: fetch all my follows and filter
        const { resources: myFollows } = await container.items.query({
          query: 'SELECT c.followingId FROM c WHERE c.followerId = @myId',
          parameters: [{ name: '@myId', value: currentUser.id }]
        }).fetchAll();
        const myFollowingIds = new Set(myFollows.map(f => f.followingId));
        followerUserIds.forEach(fid => {
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
            parameters: [{ name: '@id', value: f.followerId }]
          }).fetchAll();
          user = resources[0] || null;
        }

        let creatorProfile: Record<string, any> | null = null;
        if (creatorsContainer) {
          const { resources } = await creatorsContainer.items.query<Record<string, any>>({
            query: 'SELECT c.id, c.creatorName FROM c WHERE c.userId = @id',
            parameters: [{ name: '@id', value: f.followerId }]
          }).fetchAll();
          creatorProfile = resources[0] || null;
        }

        const u = user || { id: f.followerId, displayName: 'User' };

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
        where: { followingId: targetUserId },
        include: {
          follower: {
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
        const followerUserIds = follows.map((f) => f.follower.id);
        const myFollows = await db.follow.findMany({
          where: {
            followerId: currentUser.id,
            followingId: { in: followerUserIds },
          },
          select: { followingId: true },
        });
        currentUserFollowingSet = new Set(myFollows.map((f) => f.followingId));
      }

      const items = follows.map((f) => ({
        id: f.follower.id,
        displayName: f.follower.displayName || f.follower.username || 'User',
        username: f.follower.username || null,
        avatarUrl: f.follower.avatarUrl || null,
        role: f.follower.role,
        bio: f.follower.bio || null,
        creatorProfileId: f.follower.creatorProfile?.id || null,
        creatorName: f.follower.creatorProfile?.creatorName || null,
        isFollowing: currentUser ? currentUserFollowingSet.has(f.follower.id) : false,
        isSelf: currentUser ? currentUser.id === f.follower.id : false,
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
