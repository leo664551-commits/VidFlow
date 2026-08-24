import { getContainer } from '@/lib/cosmos';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export interface CosmosFollow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export async function getUserFollowingIds(userId: string): Promise<Set<string>> {
  const container = getContainer('follows');
  if (!container) {
    const follows = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    return new Set(follows.map((f) => f.followingId));
  }

  const query = 'SELECT c.followingId FROM c WHERE c.followerId = @userId';
  const { resources } = await container.items.query<{ followingId: string }>({
    query,
    parameters: [{ name: '@userId', value: userId }],
  }).fetchAll();

  return new Set(resources.map((r) => r.followingId));
}

export async function toggleFollow(followerId: string, followingId: string): Promise<{ isFollowing: boolean }> {
  const container = getContainer('follows');
  if (!container) {
    const existing = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existing) {
      await db.follow.delete({ where: { id: existing.id } });
      return { isFollowing: false };
    } else {
      await db.follow.create({ data: { followerId, followingId } });
      return { isFollowing: true };
    }
  }

  const query = 'SELECT * FROM c WHERE c.followerId = @followerId AND c.followingId = @followingId';
  const { resources } = await container.items.query<CosmosFollow>({
    query,
    parameters: [
      { name: '@followerId', value: followerId },
      { name: '@followingId', value: followingId },
    ],
  }).fetchAll();

  if (resources.length > 0) {
    await container.item(resources[0].id, followerId).delete();
    return { isFollowing: false };
  } else {
    await container.items.create({
      id: uuidv4(),
      followerId,
      followingId,
      createdAt: new Date().toISOString(),
    });
    return { isFollowing: true };
  }
}
