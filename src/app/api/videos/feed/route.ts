import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { apiPaginated, apiError } from '@/lib/api-response';
import { z } from 'zod';
import { GENRES } from '@/config';

const feedPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  genre: z.enum(GENRES as unknown as [string, ...string[]]).optional(),
  seed: z.string().optional(),
});

function seededRandom(seedStr: string, id: string): number {
  let hash = 0;
  const str = `${seedStr}:${id}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash % 1000000) / 1000000;
}

export async function GET(request: NextRequest) {
  const user = await getSession(request);

  const { searchParams } = new URL(request.url);
  const parsed = feedPaginationSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
  }

  const { page, limit, genre, seed } = parsed.data;
  const sessionSeed = seed || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { status: 'READY' };
  if (genre) {
    where.genre = genre;
  }

  try {
    // 1. Fetch eligible candidate videos
    const allCandidateVideos = await db.video.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        publisher: true,
        producer: true,
        genre: true,
        ageRating: true,
        thumbnailBlobName: true,
        storageBlobName: true,
        duration: true,
        viewCount: true,
        pinnedCommentId: true,
        createdAt: true,
        creator: {
          select: {
            id: true,
            creatorName: true,
            user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: {
              where: { status: 'VISIBLE', parentCommentId: null },
            },
          },
        },
      },
    });

    // 2. Query creators followed by authenticated user
    let userFollowingAll: Set<string> = new Set();
    if (user) {
      const follows = await db.follow.findMany({
        where: { followerId: user.id },
        select: { followingId: true },
      });
      userFollowingAll = new Set(follows.map((f) => f.followingId));
    }

    // 3. Score candidates with hybrid recommendation algorithm
    const now = Date.now();
    const scoredCandidates = allCandidateVideos.map((v) => {
      const isFollowed = user ? userFollowingAll.has(v.creator.user.id) : false;
      const hoursOld = Math.max(0, (now - v.createdAt.getTime()) / (1000 * 60 * 60));

      // Followed creators get heavy priority boost (2500 pts)
      const followedBonus = isFollowed ? 2500 : 0;

      // Recency bonus decays over 72 hours (up to 600 pts)
      const recencyBonus = Math.max(0, 600 - hoursOld * 8);

      // Engagement bonus (up to 250 pts)
      const engagementBonus = Math.min(250, (v._count.likes * 12) + (v.viewCount * 1));

      // Seeded pseudo-random jitter (0 - 1800 pts) for dynamic, non-repetitive discovery
      const jitter = seededRandom(sessionSeed, v.id) * 1800;

      const baseScore = followedBonus + recencyBonus + engagementBonus + jitter;

      return {
        video: v,
        creatorId: v.creator.id,
        baseScore,
        isFollowed,
      };
    });

    // 4. Anti-clustering Creator Diversity & Interleaving Pass
    // Ensures videos from the same creator are never bunched together consecutively
    const remainingPool = [...scoredCandidates];
    const orderedVideos: typeof scoredCandidates = [];
    const creatorAppearanceCount = new Map<string, number>();

    while (remainingPool.length > 0) {
      const currentIndex = orderedVideos.length;
      let bestIndex = 0;
      let bestEffectiveScore = -Infinity;

      for (let i = 0; i < remainingPool.length; i++) {
        const item = remainingPool[i];
        let penalty = 0;

        // Consecutive creator penalty (slots -1, -2, -3)
        if (currentIndex > 0 && orderedVideos[currentIndex - 1].creatorId === item.creatorId) {
          penalty += 3500; // Heavy penalty preventing back-to-back same creator
        } else if (currentIndex > 1 && orderedVideos[currentIndex - 2].creatorId === item.creatorId) {
          penalty += 1500; // Moderate penalty for same creator 2 slots back
        } else if (currentIndex > 2 && orderedVideos[currentIndex - 3].creatorId === item.creatorId) {
          penalty += 600; // Light penalty for same creator 3 slots back
        }

        // Global creator frequency dampener per feed session
        const appearances = creatorAppearanceCount.get(item.creatorId) || 0;
        penalty += appearances * 400;

        const effectiveScore = item.baseScore - penalty;

        if (
          effectiveScore > bestEffectiveScore ||
          (effectiveScore === bestEffectiveScore && item.video.id < remainingPool[bestIndex].video.id)
        ) {
          bestEffectiveScore = effectiveScore;
          bestIndex = i;
        }
      }

      const selected = remainingPool.splice(bestIndex, 1)[0];
      orderedVideos.push(selected);
      creatorAppearanceCount.set(
        selected.creatorId,
        (creatorAppearanceCount.get(selected.creatorId) || 0) + 1
      );
    }

    const total = orderedVideos.length;
    const pagedSlice = orderedVideos.slice(skip, skip + limit);
    const pagedVideos = pagedSlice.map((s) => s.video);

    // 5. If user is authenticated, fetch likes for this page slice
    let userLikes: Set<string> = new Set();
    if (user && pagedVideos.length > 0) {
      const videoIds = pagedVideos.map((v) => v.id);
      const likes = await db.videoLike.findMany({
        where: { videoId: { in: videoIds }, userId: user.id },
        select: { videoId: true },
      });
      userLikes = new Set(likes.map((l) => l.videoId));
    }

    const data = pagedVideos.map((v) => {
      const isCreatorSelf = user ? user.id === v.creator.user.id : false;
      const isFollowingCreator = user ? userFollowingAll.has(v.creator.user.id) : false;

      const result: Record<string, unknown> = {
        id: v.id,
        title: v.title,
        description: v.description,
        creator: {
          id: v.creator.id,
          creatorName: v.creator.creatorName,
          displayName: v.creator.user.displayName,
          username: v.creator.user.username || null,
          avatarUrl: v.creator.user.avatarUrl || null,
          isFollowing: isFollowingCreator,
          isSelf: isCreatorSelf,
        },
        publisher: v.publisher,
        producer: v.producer,
        genre: v.genre,
        ageRating: v.ageRating,
        thumbnailBlobName: v.thumbnailBlobName,
        storageBlobName: v.storageBlobName,
        duration: v.duration,
        viewCount: v.viewCount,
        likeCount: v._count.likes,
        commentCount: v._count.comments,
        pinnedCommentId: v.pinnedCommentId,
        createdAt: v.createdAt.toISOString(),
      };

      if (user) {
        result.userLiked = userLikes.has(v.id);
      }

      return result;
    });

    return apiPaginated(data, page, limit, total, sessionSeed);
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
