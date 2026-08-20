import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiNoContent, apiCreated, apiError } from '@/lib/api-response';
import { creatorRatingSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  const { id } = await params;

  const creator = await db.creatorProfile.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!creator) return apiError('CREATOR_NOT_FOUND');

  try {
    const ratings = await db.creatorRating.findMany({
      where: { creatorId: id },
      select: { rating: true },
    });

    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

    let userRating: number | null = null;
    if (user && (user.role === 'CONSUMER' || user.role === 'ADMIN')) {
      const existing = await db.creatorRating.findUnique({
        where: { creatorId_userId: { creatorId: id, userId: user.id } },
      });
      if (existing) userRating = existing.rating;
    }

    return apiSuccess({
      averageRating: Math.round(averageRating * 100) / 100,
      totalRatings,
      userRating,
    });
  } catch {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CONSUMER' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  const creator = await db.creatorProfile.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!creator) return apiError('CREATOR_NOT_FOUND');

  try {
    const body = await request.json();
    const parsed = creatorRatingSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
    }

    // Check if rating already exists
    const existing = await db.creatorRating.findUnique({
      where: { creatorId_userId: { creatorId: id, userId: user.id } },
    });

    if (existing) {
      return apiError('RATING_EXISTS');
    }

    const rating = await db.creatorRating.create({
      data: {
        creatorId: id,
        userId: user.id,
        rating: parsed.data.rating,
      },
    });

    return apiCreated({
      id: rating.id,
      rating: rating.rating,
      createdAt: rating.createdAt.toISOString(),
    });
  } catch (error) {
    logger.error('Create creator rating failed', { error: (error as Error).message, creatorId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CONSUMER' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = creatorRatingSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
    }

    const existing = await db.creatorRating.findUnique({
      where: { creatorId_userId: { creatorId: id, userId: user.id } },
    });

    if (!existing) {
      return apiError('RATING_NOT_FOUND');
    }

    const updated = await db.creatorRating.update({
      where: { id: existing.id },
      data: { rating: parsed.data.rating },
    });

    return apiSuccess({
      id: updated.id,
      rating: updated.rating,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error('Update creator rating failed', { error: (error as Error).message, creatorId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CONSUMER' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const existing = await db.creatorRating.findUnique({
      where: { creatorId_userId: { creatorId: id, userId: user.id } },
    });

    if (!existing) {
      return apiError('RATING_NOT_FOUND');
    }

    await db.creatorRating.delete({ where: { id: existing.id } });

    return apiNoContent();
  } catch (error) {
    logger.error('Delete creator rating failed', { error: (error as Error).message, creatorId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
