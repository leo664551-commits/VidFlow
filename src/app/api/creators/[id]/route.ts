import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { z } from 'zod';

const creatorPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const creator = await db.creatorProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, displayName: true, status: true } },
        videos: {
          where: { status: 'READY' },
          select: {
            id: true,
            title: true,
            publisher: true,
            producer: true,
            genre: true,
            ageRating: true,
            description: true,
            thumbnailBlobName: true,
            duration: true,
            viewCount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!creator) return apiError('CREATOR_NOT_FOUND');
    if (creator.user.status !== 'ACTIVE') return apiError('CREATOR_NOT_FOUND');

    const { searchParams } = new URL(request.url);
    const pagination = creatorPaginationSchema.safeParse(Object.fromEntries(searchParams));
    const { page, limit } = pagination.success ? pagination.data : { page: 1, limit: 12 };

    // Compute stats
    const totalViews = creator.videos.reduce((sum, v) => sum + v.viewCount, 0);
    const videoCount = creator.videos.length;

    // Paginate videos
    const skip = (page - 1) * limit;
    const paginatedVideos = creator.videos.slice(skip, skip + limit);

    return apiSuccess({
      creator: {
        id: creator.id,
        creatorName: creator.creatorName,
        description: creator.description,
        displayName: creator.user.displayName,
      },
      stats: {
        videoCount,
        totalViews,
      },
      videos: {
        data: paginatedVideos.map((v) => ({
          ...v,
          createdAt: v.createdAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total: videoCount,
          totalPages: Math.ceil(videoCount / limit),
        },
      },
    });
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
