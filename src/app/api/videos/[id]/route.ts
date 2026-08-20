import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiNoContent, apiError } from '@/lib/api-response';
import { videoMetadataSchema } from '@/lib/validation';
import { deleteBlob } from '@/services/storage';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/services/audit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  const { id } = await params;

  try {
    const video = await db.video.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, creatorName: true } },
        _count: {
          select: { comments: true, ratings: true },
        },
        ratings: {
          select: { rating: true },
        },
      },
    });

    if (!video) return apiError('VIDEO_NOT_FOUND');

    // Non-READY videos: only visible to creator or admin
    if (video.status !== 'READY') {
      if (!user || (user.role !== 'CREATOR' && user.role !== 'ADMIN')) {
        return apiError('VIDEO_NOT_FOUND');
      }
      if (user.role === 'CREATOR' && video.creatorId !== user.id) {
        return apiError('VIDEO_NOT_FOUND');
      }
    }

    // Track view (deduplicated by user+video+day)
    if (user && video.status === 'READY') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingView = await db.videoView.findFirst({
        where: {
          videoId: id,
          userId: user.id,
          viewedAt: { gte: today, lt: tomorrow },
        },
      });

      if (!existingView) {
        await Promise.all([
          db.videoView.create({
            data: { videoId: id, userId: user.id },
          }),
          db.video.update({
            where: { id },
            data: { viewCount: { increment: 1 } },
          }),
        ]);
      }
    }

    // Calculate rating stats
    const totalRatings = video.ratings.length;
    const averageRating = totalRatings > 0
      ? video.ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

    // Get user's rating
    let userRating: number | null = null;
    if (user) {
      const userRatingRecord = await db.rating.findUnique({
        where: { videoId_userId: { videoId: id, userId: user.id } },
      });
      if (userRatingRecord) userRating = userRatingRecord.rating;
    }

    return apiSuccess({
      id: video.id,
      title: video.title,
      publisher: video.publisher,
      producer: video.producer,
      genre: video.genre,
      ageRating: video.ageRating,
      description: video.description,
      storageBlobName: video.storageBlobName,
      thumbnailBlobName: video.thumbnailBlobName,
      duration: video.duration,
      status: video.status,
      viewCount: video.viewCount,
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
      creator: video.creator,
      averageRating: Math.round(averageRating * 100) / 100,
      totalRatings,
      userRating,
      commentCount: video._count.comments,
    });
  } catch (error) {
    logger.error('Get video failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const video = await db.video.findUnique({ where: { id } });
    if (!video) return apiError('VIDEO_NOT_FOUND');

    if (user.role === 'CREATOR' && video.creatorId !== user.id) {
      return apiError('FORBIDDEN');
    }

    const body = await request.json();
    const metadata = videoMetadataSchema.safeParse(body);
    if (!metadata.success) {
      return apiError('VALIDATION_ERROR', metadata.error.errors[0].message);
    }

    const updated = await db.video.update({
      where: { id },
      data: {
        title: metadata.data.title,
        publisher: metadata.data.publisher,
        producer: metadata.data.producer,
        genre: metadata.data.genre,
        ageRating: metadata.data.ageRating,
        description: metadata.data.description ?? null,
      },
      include: { creator: { select: { id: true, creatorName: true } } },
    });

    await createAuditLog(user.id, 'VIDEO_UPDATED', 'Video', id, { title: updated.title });

    return apiSuccess({
      id: updated.id,
      title: updated.title,
      publisher: updated.publisher,
      producer: updated.producer,
      genre: updated.genre,
      ageRating: updated.ageRating,
      description: updated.description,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      creator: updated.creator,
    });
  } catch (error) {
    logger.error('Update video failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const video = await db.video.findUnique({ where: { id } });
    if (!video) return apiError('VIDEO_NOT_FOUND');

    if (user.role === 'CREATOR' && video.creatorId !== user.id) {
      return apiError('FORBIDDEN');
    }

    // Delete blob files
    if (video.storageBlobName) {
      await deleteBlob(video.storageBlobName);
    }
    if (video.thumbnailBlobName) {
      await deleteBlob(video.thumbnailBlobName);
    }

    // Delete video (cascade will handle comments, ratings, views)
    await db.video.delete({ where: { id } });

    await createAuditLog(user.id, 'VIDEO_DELETED', 'Video', id, { title: video.title });
    logger.info('Video deleted', { videoId: id, userId: user.id });

    return apiNoContent();
  } catch (error) {
    logger.error('Delete video failed', { error: (error as Error).message, videoId: id });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
