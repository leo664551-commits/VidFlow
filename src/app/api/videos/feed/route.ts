import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { apiPaginated, apiError } from '@/lib/api-response';
import { z } from 'zod';
import { GENRES } from '@/config';
import { getContainer } from '@/lib/cosmos';

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

  try {
    const videosContainer = getContainer('videos');

    if (videosContainer) {
      // ===== Cosmos DB path =====
      let query = 'SELECT * FROM c WHERE c.status = "READY"';
      const parameters: Array<{ name: string; value: string }> = [];
      if (genre) {
        query += ' AND c.genre = @genre';
        parameters.push({ name: '@genre', value: genre });
      }

      const { resources: allVideos } = await videosContainer.items
        .query({ query, parameters })
        .fetchAll();

      // Get creator profiles for these videos
      const cpContainer = getContainer('creatorProfiles');
      const usersContainer = getContainer('users');
      const creatorMap = new Map<string, Record<string, unknown>>();

      if (cpContainer && usersContainer) {
        const creatorIds = [...new Set(allVideos.map((v: Record<string, unknown>) => v.creatorId as string))];
        for (const cid of creatorIds) {
          const { resources: profiles } = await cpContainer.items
            .query({ query: 'SELECT * FROM c WHERE c.userId = @uid', parameters: [{ name: '@uid', value: cid }] })
            .fetchAll();
          const { resources: users } = await usersContainer.items
            .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: cid }] })
            .fetchAll();
          if (profiles[0] || users[0]) {
            creatorMap.set(cid, {
              id: profiles[0]?.id || cid,
              creatorName: profiles[0]?.creatorName || users[0]?.displayName || 'Creator',
              user: {
                id: cid,
                displayName: users[0]?.displayName || 'Creator',
                username: users[0]?.username || null,
                avatarUrl: users[0]?.avatarUrl || null,
              },
            });
          }
        }
      }

      // Get user's follows
      let userFollowingAll: Set<string> = new Set();
      if (user) {
        const followsContainer = getContainer('follows');
        if (followsContainer) {
          const { resources: follows } = await followsContainer.items
            .query({ query: 'SELECT c.followingId FROM c WHERE c.followerId = @uid', parameters: [{ name: '@uid', value: user.id }] })
            .fetchAll();
          userFollowingAll = new Set(follows.map((f: Record<string, string>) => f.followingId));
        }
      }

      // Score and sort
      const now = Date.now();
      const scoredCandidates = allVideos.map((v: Record<string, unknown>) => {
        const creatorId = v.creatorId as string;
        const isFollowed = user ? userFollowingAll.has(creatorId) : false;
        const createdAt = new Date(v.createdAt as string).getTime();
        const hoursOld = Math.max(0, (now - createdAt) / (1000 * 60 * 60));

        const followedBonus = isFollowed ? 2500 : 0;
        const recencyBonus = Math.max(0, 600 - hoursOld * 8);
        const engagementBonus = Math.min(250, ((v.likeCount as number || 0) * 12) + ((v.viewCount as number || 0) * 1));
        const jitter = seededRandom(sessionSeed, v.id as string) * 1800;
        const baseScore = followedBonus + recencyBonus + engagementBonus + jitter;

        return { video: v, creatorId, baseScore, isFollowed };
      });

      // Anti-clustering
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
          if (currentIndex > 0 && orderedVideos[currentIndex - 1].creatorId === item.creatorId) penalty += 3500;
          else if (currentIndex > 1 && orderedVideos[currentIndex - 2].creatorId === item.creatorId) penalty += 1500;
          else if (currentIndex > 2 && orderedVideos[currentIndex - 3].creatorId === item.creatorId) penalty += 600;
          const appearances = creatorAppearanceCount.get(item.creatorId) || 0;
          penalty += appearances * 400;
          const effectiveScore = item.baseScore - penalty;
          if (effectiveScore > bestEffectiveScore || (effectiveScore === bestEffectiveScore && (item.video.id as string) < (remainingPool[bestIndex].video.id as string))) {
            bestEffectiveScore = effectiveScore;
            bestIndex = i;
          }
        }

        const selected = remainingPool.splice(bestIndex, 1)[0];
        orderedVideos.push(selected);
        creatorAppearanceCount.set(selected.creatorId, (creatorAppearanceCount.get(selected.creatorId) || 0) + 1);
      }

      const total = orderedVideos.length;
      const pagedSlice = orderedVideos.slice(skip, skip + limit);

      const data = pagedSlice.map((s) => {
        const v = s.video;
        const creator = creatorMap.get(s.creatorId) || { id: s.creatorId, creatorName: 'Creator', user: { id: s.creatorId, displayName: 'Creator', username: null, avatarUrl: null } };
        const creatorUser = creator.user as Record<string, unknown>;
        const isCreatorSelf = user ? user.id === creatorUser.id : false;
        const isFollowingCreator = user ? userFollowingAll.has(creatorUser.id as string) : false;

        const result: Record<string, unknown> = {
          id: v.id,
          title: v.title,
          description: v.description,
          creator: {
            id: creator.id,
            creatorName: creator.creatorName,
            displayName: creatorUser.displayName,
            username: creatorUser.username || null,
            avatarUrl: creatorUser.avatarUrl || null,
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
          viewCount: v.viewCount || 0,
          likeCount: v.likeCount || 0,
          commentCount: v.commentCount || 0,
          pinnedCommentId: v.pinnedCommentId,
          createdAt: v.createdAt,
        };

        if (user) {
          result.userLiked = false;
        }

        return result;
      });

      return apiPaginated(data, page, limit, total, sessionSeed);
    }

    // ===== Prisma fallback =====
    const where: Record<string, unknown> = { status: 'READY' };
    if (genre) where.genre = genre;

    const allCandidateVideos = await db.video.findMany({
      where,
      select: {
        id: true, title: true, description: true, publisher: true, producer: true,
        genre: true, ageRating: true, thumbnailBlobName: true, storageBlobName: true,
        duration: true, viewCount: true, pinnedCommentId: true, createdAt: true,
        creator: {
          select: {
            id: true, creatorName: true,
            user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
          },
        },
        _count: { select: { likes: true, comments: { where: { status: 'VISIBLE', parentCommentId: null } } } },
      },
    });

    let userFollowingAll: Set<string> = new Set();
    if (user) {
      const follows = await db.follow.findMany({ where: { followerId: user.id }, select: { followingId: true } });
      userFollowingAll = new Set(follows.map((f) => f.followingId));
    }

    const now = Date.now();
    const scoredCandidates = allCandidateVideos.map((v) => {
      const isFollowed = user ? userFollowingAll.has(v.creator.user.id) : false;
      const hoursOld = Math.max(0, (now - v.createdAt.getTime()) / (1000 * 60 * 60));
      const followedBonus = isFollowed ? 2500 : 0;
      const recencyBonus = Math.max(0, 600 - hoursOld * 8);
      const engagementBonus = Math.min(250, (v._count.likes * 12) + (v.viewCount * 1));
      const jitter = seededRandom(sessionSeed, v.id) * 1800;
      const baseScore = followedBonus + recencyBonus + engagementBonus + jitter;
      return { video: v, creatorId: v.creator.id, baseScore, isFollowed };
    });

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
        if (currentIndex > 0 && orderedVideos[currentIndex - 1].creatorId === item.creatorId) penalty += 3500;
        else if (currentIndex > 1 && orderedVideos[currentIndex - 2].creatorId === item.creatorId) penalty += 1500;
        else if (currentIndex > 2 && orderedVideos[currentIndex - 3].creatorId === item.creatorId) penalty += 600;
        const appearances = creatorAppearanceCount.get(item.creatorId) || 0;
        penalty += appearances * 400;
        const effectiveScore = item.baseScore - penalty;
        if (effectiveScore > bestEffectiveScore || (effectiveScore === bestEffectiveScore && item.video.id < remainingPool[bestIndex].video.id)) {
          bestEffectiveScore = effectiveScore;
          bestIndex = i;
        }
      }
      const selected = remainingPool.splice(bestIndex, 1)[0];
      orderedVideos.push(selected);
      creatorAppearanceCount.set(selected.creatorId, (creatorAppearanceCount.get(selected.creatorId) || 0) + 1);
    }

    const total = orderedVideos.length;
    const pagedSlice = orderedVideos.slice(skip, skip + limit);
    const pagedVideos = pagedSlice.map((s) => s.video);

    let userLikes: Set<string> = new Set();
    if (user && pagedVideos.length > 0) {
      const videoIds = pagedVideos.map((v) => v.id);
      const likes = await db.videoLike.findMany({ where: { videoId: { in: videoIds }, userId: user.id }, select: { videoId: true } });
      userLikes = new Set(likes.map((l) => l.videoId));
    }

    const data = pagedVideos.map((v) => {
      const isCreatorSelf = user ? user.id === v.creator.user.id : false;
      const isFollowingCreator = user ? userFollowingAll.has(v.creator.user.id) : false;
      const result: Record<string, unknown> = {
        id: v.id, title: v.title, description: v.description,
        creator: { id: v.creator.id, creatorName: v.creator.creatorName, displayName: v.creator.user.displayName, username: v.creator.user.username || null, avatarUrl: v.creator.user.avatarUrl || null, isFollowing: isFollowingCreator, isSelf: isCreatorSelf },
        publisher: v.publisher, producer: v.producer, genre: v.genre, ageRating: v.ageRating,
        thumbnailBlobName: v.thumbnailBlobName, storageBlobName: v.storageBlobName, duration: v.duration,
        viewCount: v.viewCount, likeCount: v._count.likes, commentCount: v._count.comments,
        pinnedCommentId: v.pinnedCommentId, createdAt: v.createdAt.toISOString(),
      };
      if (user) result.userLiked = userLikes.has(v.id);
      return result;
    });

    return apiPaginated(data, page, limit, total, sessionSeed);
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
