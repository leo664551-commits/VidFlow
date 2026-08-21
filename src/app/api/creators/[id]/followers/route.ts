import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

async function resolveTargetUserId(id: string): Promise<string | null> {
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

    // Check which followers the current user is following
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
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
