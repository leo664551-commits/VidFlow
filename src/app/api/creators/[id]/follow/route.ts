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
  const user = await getSession(request);
  const { id } = await params;

  const targetUserId = await resolveTargetUserId(id);
  if (!targetUserId) return apiError('CREATOR_NOT_FOUND');

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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  const { id } = await params;

  const targetUserId = await resolveTargetUserId(id);
  if (!targetUserId) return apiError('CREATOR_NOT_FOUND');

  if (targetUserId === user.id) {
    return apiError('FORBIDDEN', 'You cannot follow yourself');
  }

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
    // Unfollow
    await db.follow.delete({
      where: { id: existing.id },
    });
    isFollowing = false;
  } else {
    // Follow
    await db.follow.create({
      data: {
        followerId: user.id,
        followingId: targetUserId,
      },
    });
    isFollowing = true;
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