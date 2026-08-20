import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CREATOR') return apiError('FORBIDDEN');

  if (!user.creatorProfile) return apiError('FORBIDDEN', 'No creator profile found');

  try {
    const creatorId = user.id;

    const [totalVideos, readyVideos, totalViews, totalComments, totalRatings, recentVideos] =
      await Promise.all([
        db.video.count({ where: { creatorId } }),
        db.video.count({ where: { creatorId, status: 'READY' } }),
        db.video.aggregate({
          where: { creatorId },
          _sum: { viewCount: true },
        }),
        db.comment.count({
          where: { video: { creatorId } },
        }),
        db.rating.count({
          where: { video: { creatorId } },
        }),
        db.video.findMany({
          where: { creatorId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            status: true,
            viewCount: true,
            createdAt: true,
          },
        }),
      ]);

    return apiSuccess({
      stats: {
        totalVideos,
        readyVideos,
        totalViews: totalViews._sum.viewCount || 0,
        totalComments,
        totalRatings,
      },
      recentVideos: recentVideos.map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
      })),
      creatorProfile: user.creatorProfile,
    });
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
