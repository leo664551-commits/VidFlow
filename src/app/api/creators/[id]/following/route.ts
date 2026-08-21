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

    // Check which users in this list the current user is following
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
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
