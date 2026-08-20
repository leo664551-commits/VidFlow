import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  try {
    const [
      totalUsers,
      totalCreators,
      totalVideos,
      readyVideos,
      totalComments,
      totalVideoLikes,
      totalCreatorRatings,
      totalViews,
      recentUsers,
      recentVideos,
    ] = await Promise.all([
      db.user.count(),
      db.creatorProfile.count(),
      db.video.count(),
      db.video.count({ where: { status: 'READY' } }),
      db.comment.count(),
      db.videoLike.count(),
      db.creatorRating.count(),
      db.video.aggregate({ _sum: { viewCount: true } }),
      db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, email: true, displayName: true, role: true, status: true, createdAt: true },
      }),
      db.video.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { creator: { select: { creatorName: true } } },
      }),
    ]);

    return apiSuccess({
      stats: {
        totalUsers,
        totalCreators,
        totalVideos,
        readyVideos,
        totalComments,
        totalVideoLikes,
        totalCreatorRatings,
        totalViews: totalViews._sum.viewCount || 0,
      },
      recentUsers: recentUsers.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
      recentVideos: recentVideos.map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
      })),
    });
  } catch {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
