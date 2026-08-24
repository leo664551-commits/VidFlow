import { getContainer } from '@/lib/cosmos';
import { db } from '@/lib/db';
import type { RatingEligibilityResult, CreatorRatingSummary } from '@/lib/rating-eligibility';
import { v4 as uuidv4 } from 'uuid';

export interface CosmosCreatorRating {
  id: string;
  creatorId: string;
  userId: string;
  rating: number;
  overallRating: number;
  contentQuality: number;
  valueRating: number;
  creativityRating: number;
  entertainmentRating: number;
  consistencyRating: number;
  review: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  };
}

export interface CosmosVideoWatch {
  id: string;
  userId: string;
  videoId: string;
  creatorId: string;
  watchDuration: number;
  videoDuration: number;
  completionPercentage: number;
  lastWatchedAt: string;
  createdAt: string;
  updatedAt: string;
}

export async function recordVideoWatch(data: {
  userId: string;
  videoId: string;
  creatorId: string;
  watchDuration: number;
  videoDuration: number;
}): Promise<void> {
  const completionPercentage = data.videoDuration > 0
    ? Math.min(1.0, data.watchDuration / data.videoDuration)
    : 0;

  const now = new Date().toISOString();
  const container = getContainer('videoWatches');
  if (!container) {
    await db.videoWatch.upsert({
      where: {
        userId_videoId: {
          userId: data.userId,
          videoId: data.videoId,
        },
      },
      update: {
        watchDuration: data.watchDuration,
        videoDuration: data.videoDuration,
        completionPercentage,
        lastWatchedAt: new Date(),
      },
      create: {
        userId: data.userId,
        videoId: data.videoId,
        creatorId: data.creatorId,
        watchDuration: data.watchDuration,
        videoDuration: data.videoDuration,
        completionPercentage,
      },
    });
    return;
  }

  const query = 'SELECT * FROM c WHERE c.userId = @userId AND c.videoId = @videoId';
  const { resources } = await container.items.query<CosmosVideoWatch>({
    query,
    parameters: [
      { name: '@userId', value: data.userId },
      { name: '@videoId', value: data.videoId },
    ],
  }).fetchAll();

  if (resources.length > 0) {
    const existing = resources[0];
    existing.watchDuration = Math.max(existing.watchDuration, data.watchDuration);
    existing.videoDuration = data.videoDuration;
    existing.completionPercentage = Math.max(existing.completionPercentage, completionPercentage);
    existing.lastWatchedAt = now;
    existing.updatedAt = now;
    await container.item(existing.id, data.userId).replace(existing);
  } else {
    const newWatch: CosmosVideoWatch = {
      id: uuidv4(),
      userId: data.userId,
      videoId: data.videoId,
      creatorId: data.creatorId,
      watchDuration: data.watchDuration,
      videoDuration: data.videoDuration,
      completionPercentage,
      lastWatchedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await container.items.create(newWatch);
  }
}
