import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiNoContent, apiCreated, apiError } from '@/lib/api-response';
import { createNotification } from '@/services/notification';
import {
  checkCreatorRatingEligibility,
  calculateCreatorRatingSummary,
} from '@/lib/rating-eligibility';
import { z } from 'zod';

const rateCreatorSchema = z.object({
  overallRating: z.number().min(1).max(10).optional(),
  rating: z.number().min(1).max(10).optional(),
  contentQuality: z.number().min(1).max(10).optional().nullable(),
  valueRating: z.number().min(1).max(10).optional().nullable(),
  creativityRating: z.number().min(1).max(10).optional().nullable(),
  entertainmentRating: z.number().min(1).max(10).optional().nullable(),
  consistencyRating: z.number().min(1).max(10).optional().nullable(),
  review: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(request);
  const { id } = await params;

  try {
    const creator = await db.creatorProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] },
      select: { id: true, userId: true },
    });

    if (!creator) return apiError('CREATOR_NOT_FOUND', 'Creator not found');

    const [eligibility, summary] = await Promise.all([
      checkCreatorRatingEligibility(user?.id, creator.id),
      calculateCreatorRatingSummary(creator.id),
    ]);

    return apiSuccess({
      eligibility,
      summary,
      averageRating: summary.averageRating,
      totalRatings: summary.totalRatings,
      bayesianScore: summary.bayesianScore,
      confidenceLevel: summary.confidenceLevel,
      dimensionAverages: summary.dimensionAverages,
      ratingBreakdown: summary.ratingBreakdown,
      userRating: eligibility.userRating,
      reviews: summary.reviews,
    });
  } catch (error) {
    console.error('Error fetching creator ratings:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED', 'Please log in to rate creators');

  const { id } = await params;

  try {
    const creator = await db.creatorProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] },
      select: { id: true, userId: true, creatorName: true },
    });

    if (!creator) return apiError('CREATOR_NOT_FOUND', 'Creator not found');

    // Server-side check: Creator cannot rate themselves
    if (creator.userId === user.id) {
      return apiError('FORBIDDEN', 'You cannot rate your own creator profile');
    }

    // Server-side verification: Check watch progress eligibility
    const eligibility = await checkCreatorRatingEligibility(user.id, creator.id);
    if (!eligibility.eligible && !eligibility.userRating) {
      return apiError(
        'FORBIDDEN',
        eligibility.reason ||
          'You must watch at least 3 videos from this creator (with 50%+ completion) to unlock ratings.'
      );
    }

    const body = await request.json();
    const parsed = rateCreatorSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
    }

    const {
      overallRating,
      rating,
      contentQuality,
      valueRating,
      creativityRating,
      entertainmentRating,
      consistencyRating,
      review,
      tags,
    } = parsed.data;

    const finalOverallRating =
      overallRating !== undefined
        ? overallRating
        : rating !== undefined
        ? rating > 5
          ? rating
          : rating * 2
        : 8.0;

    const legacyRating = Math.max(1, Math.min(5, Math.round(finalOverallRating / 2)));
    const tagsString = tags && tags.length > 0 ? tags.join(',') : null;

    const existing = await db.creatorRating.findUnique({
      where: { creatorId_userId: { creatorId: creator.id, userId: user.id } },
    });

    let savedRating;
    if (existing) {
      savedRating = await db.creatorRating.update({
        where: { id: existing.id },
        data: {
          overallRating: finalOverallRating,
          rating: legacyRating,
          contentQuality: contentQuality ?? 7,
          valueRating: valueRating ?? 7,
          creativityRating: creativityRating ?? 7,
          entertainmentRating: entertainmentRating ?? 7,
          consistencyRating: consistencyRating ?? 7,
          review: review || null,
          tags: tagsString,
        },
      });
    } else {
      savedRating = await db.creatorRating.create({
        data: {
          creatorId: creator.id,
          userId: user.id,
          overallRating: finalOverallRating,
          rating: legacyRating,
          contentQuality: contentQuality ?? 7,
          valueRating: valueRating ?? 7,
          creativityRating: creativityRating ?? 7,
          entertainmentRating: entertainmentRating ?? 7,
          consistencyRating: consistencyRating ?? 7,
          review: review || null,
          tags: tagsString,
        },
      });
    }

    // Notify creator if rater is not the creator
    if (creator.userId !== user.id) {
      const actorName = user.displayName || user.username || 'Someone';
      await createNotification({
        userId: creator.userId,
        actorId: user.id,
        type: 'CREATOR_RATING',
        title: 'New Creator Rating',
        message: `${actorName} rated your creator profile (${finalOverallRating.toFixed(1)}/10)`,
        entityType: 'CreatorProfile',
        entityId: creator.id,
      });
    }

    const updatedSummary = await calculateCreatorRatingSummary(creator.id);

    return apiCreated({
      id: savedRating.id,
      overallRating: savedRating.overallRating,
      rating: savedRating.rating,
      contentQuality: savedRating.contentQuality,
      valueRating: savedRating.valueRating,
      creativityRating: savedRating.creativityRating,
      entertainmentRating: savedRating.entertainmentRating,
      consistencyRating: savedRating.consistencyRating,
      review: savedRating.review,
      tags: savedRating.tags ? savedRating.tags.split(',') : [],
      createdAt: savedRating.createdAt.toISOString(),
      updatedAt: savedRating.updatedAt.toISOString(),
      summary: updatedSummary,
    });
  } catch (error) {
    console.error('Error submitting rating:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return POST(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED', 'Please log in');

  const { id } = await params;

  try {
    const creator = await db.creatorProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] },
      select: { id: true },
    });

    if (!creator) return apiError('CREATOR_NOT_FOUND', 'Creator not found');

    const existing = await db.creatorRating.findUnique({
      where: { creatorId_userId: { creatorId: creator.id, userId: user.id } },
    });

    if (!existing) return apiError('NOT_FOUND', 'Rating not found');

    await db.creatorRating.delete({
      where: { id: existing.id },
    });

    return apiNoContent();
  } catch (error) {
    console.error('Error deleting rating:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}