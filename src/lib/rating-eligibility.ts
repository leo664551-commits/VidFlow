import { db } from '@/lib/db';

export interface RatingEligibilityResult {
  eligible: boolean;
  canRate: boolean;
  isSelf: boolean;
  status: 'NOT_LOGGED_IN' | 'SELF' | 'NOT_ELIGIBLE' | 'ALMOST_ELIGIBLE' | 'ELIGIBLE' | 'ALREADY_RATED';
  qualifyingVideos: number;
  requiredVideos: number;
  averageCompletion: number; // e.g. 0.73 (73%)
  totalCreatorVideos: number;
  reason: string;
  userRating?: {
    id: string;
    overallRating: number;
    rating: number;
    contentQuality: number | null;
    valueRating: number | null;
    creativityRating: number | null;
    entertainmentRating: number | null;
    consistencyRating: number | null;
    review: string | null;
    tags: string[];
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface CreatorRatingSummary {
  totalRatings: number;
  averageRating: number; // 1.0 - 10.0 scale
  bayesianScore: number;
  confidenceLevel: 'LIMITED_DATA' | 'MODERATE' | 'ESTABLISHED';
  isLimitedData: boolean;
  dimensionAverages: {
    contentQuality: number;
    valueRating: number;
    creativityRating: number;
    entertainmentRating: number;
    consistencyRating: number;
  };
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  reviews: Array<{
    id: string;
    overallRating: number;
    rating: number;
    contentQuality: number | null;
    valueRating: number | null;
    creativityRating: number | null;
    entertainmentRating: number | null;
    consistencyRating: number | null;
    review: string | null;
    tags: string[];
    createdAt: string;
    user: {
      id: string;
      displayName: string;
      username: string | null;
      avatarUrl: string | null;
    };
  }>;
}

/**
 * Validates whether a consumer is eligible to rate a creator based on:
 * Condition A: Meaningfully watched at least 3 unique videos from creator (or all available if 1-2).
 * Condition B: Average watch completion >= 50% across qualifying videos (each qualifying video has >= 50% completion).
 */
export async function checkCreatorRatingEligibility(
  userId: string | null | undefined,
  creatorProfileIdOrUserId: string
): Promise<RatingEligibilityResult> {
  // Find Creator Profile
  const creator = await db.creatorProfile.findFirst({
    where: {
      OR: [{ id: creatorProfileIdOrUserId }, { userId: creatorProfileIdOrUserId }],
    },
    select: { id: true, userId: true, creatorName: true },
  });

  if (!creator) {
    return {
      eligible: false,
      canRate: false,
      isSelf: false,
      status: 'NOT_ELIGIBLE',
      qualifyingVideos: 0,
      requiredVideos: 3,
      averageCompletion: 0,
      totalCreatorVideos: 0,
      reason: 'Creator not found.',
      userRating: null,
    };
  }

  if (!userId) {
    return {
      eligible: false,
      canRate: false,
      isSelf: false,
      status: 'NOT_LOGGED_IN',
      qualifyingVideos: 0,
      requiredVideos: 3,
      averageCompletion: 0,
      totalCreatorVideos: 0,
      reason: 'Please log in to rate creators.',
      userRating: null,
    };
  }

  // Prevent creator from rating themselves
  if (creator.userId === userId) {
    return {
      eligible: false,
      canRate: false,
      isSelf: true,
      status: 'SELF',
      qualifyingVideos: 0,
      requiredVideos: 0,
      averageCompletion: 0,
      totalCreatorVideos: 0,
      reason: 'You cannot rate your own creator profile.',
      userRating: null,
    };
  }

  // Check if consumer already submitted an active rating
  const existingRating = await db.creatorRating.findUnique({
    where: {
      creatorId_userId: {
        creatorId: creator.id,
        userId,
      },
    },
  });

  // Fetch all active, ready videos by this creator
  const creatorVideos = await db.video.findMany({
    where: {
      creatorId: creator.userId,
      status: 'READY',
    },
    select: { id: true },
  });

  const totalCreatorVideos = creatorVideos.length;
  // Fallback rule: if creator has 1-2 videos, require all available. If 3+, require 3.
  const requiredVideos = Math.max(1, Math.min(3, totalCreatorVideos));

  if (totalCreatorVideos === 0) {
    return {
      eligible: false,
      canRate: false,
      isSelf: false,
      status: 'NOT_ELIGIBLE',
      qualifyingVideos: 0,
      requiredVideos,
      averageCompletion: 0,
      totalCreatorVideos: 0,
      reason: 'This creator has not uploaded any videos yet.',
      userRating: existingRating
        ? {
            id: existingRating.id,
            overallRating: existingRating.overallRating,
            rating: existingRating.rating,
            contentQuality: existingRating.contentQuality,
            valueRating: existingRating.valueRating,
            creativityRating: existingRating.creativityRating,
            entertainmentRating: existingRating.entertainmentRating,
            consistencyRating: existingRating.consistencyRating,
            review: existingRating.review,
            tags: existingRating.tags ? existingRating.tags.split(',') : [],
            createdAt: existingRating.createdAt.toISOString(),
            updatedAt: existingRating.updatedAt.toISOString(),
          }
        : null,
    };
  }

  // Fetch consumer's video watch records for this creator's videos
  const videoIds = creatorVideos.map((v) => v.id);
  const watchRecords = await db.videoWatch.findMany({
    where: {
      userId,
      creatorId: creator.userId,
      videoId: { in: videoIds },
    },
  });

  // A qualifying video must have completionPercentage >= 0.50 (50%)
  const qualifyingWatches = watchRecords.filter((w) => w.completionPercentage >= 0.5);
  const qualifyingVideos = qualifyingWatches.length;

  const averageCompletion =
    qualifyingVideos > 0
      ? qualifyingWatches.reduce((sum, w) => sum + w.completionPercentage, 0) / qualifyingVideos
      : 0;

  const meetsCountRequirement = qualifyingVideos >= requiredVideos;
  const meetsCompletionRequirement = averageCompletion >= 0.5;

  // Once qualified or if already rated, user retains eligibility
  const eligible = (meetsCountRequirement && meetsCompletionRequirement) || !!existingRating;
  const canRate = eligible;

  let status: RatingEligibilityResult['status'] = 'NOT_ELIGIBLE';
  let reason = '';

  if (existingRating) {
    status = 'ALREADY_RATED';
    reason = 'You have rated this creator. You can update your rating anytime.';
  } else if (eligible) {
    status = 'ELIGIBLE';
    reason = "You have watched enough of this creator's content to leave a rating.";
  } else if (qualifyingVideos > 0 && qualifyingVideos < requiredVideos) {
    status = 'ALMOST_ELIGIBLE';
    const remaining = requiredVideos - qualifyingVideos;
    reason = `${qualifyingVideos}/${requiredVideos} qualifying videos watched. Watch ${remaining} more video${
      remaining > 1 ? 's' : ''
    } (at least 50% completion) to unlock rating.`;
  } else if (qualifyingVideos >= requiredVideos && !meetsCompletionRequirement) {
    status = 'ALMOST_ELIGIBLE';
    reason = `Keep watching this creator's videos to reach an average watch completion of 50% (currently ${Math.round(
      averageCompletion * 100
    )}%).`;
  } else {
    status = 'NOT_ELIGIBLE';
    reason = `Watch at least ${requiredVideos} video${
      requiredVideos > 1 ? 's' : ''
    } from this creator (at least 50% each) to unlock rating.`;
  }

  return {
    eligible,
    canRate,
    isSelf: false,
    status,
    qualifyingVideos,
    requiredVideos,
    averageCompletion: Math.round(averageCompletion * 100) / 100,
    totalCreatorVideos,
    reason,
    userRating: existingRating
      ? {
          id: existingRating.id,
          overallRating: existingRating.overallRating,
          rating: existingRating.rating,
          contentQuality: existingRating.contentQuality,
          valueRating: existingRating.valueRating,
          creativityRating: existingRating.creativityRating,
          entertainmentRating: existingRating.entertainmentRating,
          consistencyRating: existingRating.consistencyRating,
          review: existingRating.review,
          tags: existingRating.tags ? existingRating.tags.split(',') : [],
          createdAt: existingRating.createdAt.toISOString(),
          updatedAt: existingRating.updatedAt.toISOString(),
        }
      : null,
  };
}

/**
 * Calculates statistically robust aggregate ratings for a creator,
 * including Bayesian damping and dimension breakdowns.
 */
export async function calculateCreatorRatingSummary(
  creatorProfileIdOrUserId: string
): Promise<CreatorRatingSummary> {
  const creator = await db.creatorProfile.findFirst({
    where: {
      OR: [{ id: creatorProfileIdOrUserId }, { userId: creatorProfileIdOrUserId }],
    },
    select: { id: true },
  });

  if (!creator) {
    return {
      totalRatings: 0,
      averageRating: 0,
      bayesianScore: 0,
      confidenceLevel: 'LIMITED_DATA',
      isLimitedData: true,
      dimensionAverages: {
        contentQuality: 0,
        valueRating: 0,
        creativityRating: 0,
        entertainmentRating: 0,
        consistencyRating: 0,
      },
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      reviews: [],
    };
  }

  const ratings = await db.creatorRating.findMany({
    where: { creatorId: creator.id },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalRatings = ratings.length;

  if (totalRatings === 0) {
    return {
      totalRatings: 0,
      averageRating: 0,
      bayesianScore: 0,
      confidenceLevel: 'LIMITED_DATA',
      isLimitedData: true,
      dimensionAverages: {
        contentQuality: 0,
        valueRating: 0,
        creativityRating: 0,
        entertainmentRating: 0,
        consistencyRating: 0,
      },
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      reviews: [],
    };
  }

  // Arithmetic average on 1.0 - 10.0 scale (or convert 1-5 legacy to 1-10 if overallRating not populated)
  const sumOverall = ratings.reduce((sum, r) => {
    const score = r.overallRating || (r.rating ? r.rating * 2 : 5);
    return sum + score;
  }, 0);
  const averageRating = Math.round((sumOverall / totalRatings) * 10) / 10;

  // Bayesian average formula: (C * m + sum) / (C + n)
  // C = 5 prior ratings, m = 7.5 (prior expected mean)
  const PRIOR_WEIGHT = 5;
  const PRIOR_MEAN = 7.5;
  const bayesianScore =
    Math.round(((PRIOR_WEIGHT * PRIOR_MEAN + sumOverall) / (PRIOR_WEIGHT + totalRatings)) * 10) / 10;

  // Confidence classification
  const confidenceLevel =
    totalRatings >= 10 ? 'ESTABLISHED' : totalRatings >= 3 ? 'MODERATE' : 'LIMITED_DATA';

  // Sub-dimension averages
  const sumQuality = ratings.reduce((s, r) => s + (r.contentQuality || 7), 0);
  const sumValue = ratings.reduce((s, r) => s + (r.valueRating || 7), 0);
  const sumCreativity = ratings.reduce((s, r) => s + (r.creativityRating || 7), 0);
  const sumEntertainment = ratings.reduce((s, r) => s + (r.entertainmentRating || 7), 0);
  const sumConsistency = ratings.reduce((s, r) => s + (r.consistencyRating || 7), 0);

  const dimensionAverages = {
    contentQuality: Math.round((sumQuality / totalRatings) * 10) / 10,
    valueRating: Math.round((sumValue / totalRatings) * 10) / 10,
    creativityRating: Math.round((sumCreativity / totalRatings) * 10) / 10,
    entertainmentRating: Math.round((sumEntertainment / totalRatings) * 10) / 10,
    consistencyRating: Math.round((sumConsistency / totalRatings) * 10) / 10,
  };

  // Star breakdown (normalized to 5 buckets)
  const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of ratings) {
    const score = r.overallRating || (r.rating ? r.rating * 2 : 5);
    if (score >= 9) ratingBreakdown[5]++;
    else if (score >= 7) ratingBreakdown[4]++;
    else if (score >= 5) ratingBreakdown[3]++;
    else if (score >= 3) ratingBreakdown[2]++;
    else ratingBreakdown[1]++;
  }

  const reviews = ratings.map((r) => ({
    id: r.id,
    overallRating: r.overallRating || (r.rating ? r.rating * 2 : 5),
    rating: r.rating || 5,
    contentQuality: r.contentQuality,
    valueRating: r.valueRating,
    creativityRating: r.creativityRating,
    entertainmentRating: r.entertainmentRating,
    consistencyRating: r.consistencyRating,
    review: r.review,
    tags: r.tags ? r.tags.split(',') : [],
    createdAt: r.createdAt.toISOString(),
    user: {
      id: r.user.id,
      displayName: r.user.displayName,
      username: r.user.username || r.user.displayName.toLowerCase().replace(/[^a-z0-9_]/g, ''),
      avatarUrl: r.user.avatarUrl || null,
    },
  }));

  return {
    totalRatings,
    averageRating,
    bayesianScore,
    confidenceLevel,
    isLimitedData: totalRatings < 5,
    dimensionAverages,
    ratingBreakdown,
    reviews,
  };
}
