import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      users7d,
      users14d,
      totalCreators,
      creators7d,
      creators14d,
      totalVideos,
      readyVideos,
      videos7d,
      videos14d,
      totalComments,
      totalVideoLikes,
      totalCreatorRatings,
      totalViews,
      genreCounts,
      watchCompletionAgg,
      recentUsers,
      recentVideos,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      db.user.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      db.creatorProfile.count(),
      db.creatorProfile.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      db.creatorProfile.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
      db.video.count(),
      db.video.count({ where: { status: 'READY' } }),
      db.video.count({ where: { createdAt: { gte: sevenDaysAgo }, status: 'READY' } }),
      db.video.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo }, status: 'READY' } }),
      db.comment.count(),
      db.videoLike.count(),
      db.creatorRating.count(),
      db.video.aggregate({ _sum: { viewCount: true } }),
      db.video.groupBy({
        by: ['genre'],
        where: { status: 'READY' },
        _count: { id: true },
      }),
      db.videoWatch.aggregate({
        _avg: { completionPercentage: true },
      }),
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

    function calcTrend(curr: number, prev: number) {
      if (prev === 0) return { value: curr > 0 ? `+${curr} this week` : '0%', isPositive: curr >= 0 };
      const pct = ((curr - prev) / prev) * 100;
      return {
        value: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
        isPositive: pct >= 0,
      };
    }

    const sumViews = totalViews._sum.viewCount || 0;
    const avgWatchPct = watchCompletionAgg._avg.completionPercentage
      ? `${(watchCompletionAgg._avg.completionPercentage * 100).toFixed(1)}%`
      : '0.0%';

    const genreColorMap: Record<string, string> = {
      COMEDY: 'bg-amber-500',
      ACTION: 'bg-rose-500',
      DRAMA: 'bg-purple-500',
      SCIENCE_FICTION: 'bg-[#24BBA9]',
      ANIMATION: 'bg-pink-500',
      DOCUMENTARY: 'bg-emerald-500',
      THRILLER: 'bg-orange-500',
      ROMANCE: 'bg-rose-400',
      MUSIC: 'bg-violet-500',
      OTHER: 'bg-zinc-500',
    };

    const genreDistribution = genreCounts.map((gc) => {
      const gKey = gc.genre.toUpperCase().replace(/\s+/g, '_');
      const count = gc._count.id;
      const percentage = readyVideos > 0 ? Math.round((count / readyVideos) * 100) : 0;
      return {
        genre: gc.genre.replace('_', ' '),
        count,
        percentage,
        color: genreColorMap[gKey] || 'bg-[#5E70FF]',
      };
    });

    const userTrend = calcTrend(users7d, users14d);
    const creatorTrend = calcTrend(creators7d, creators14d);
    const videoTrend = calcTrend(videos7d, videos14d);

    const commentToViewRate = sumViews > 0 ? ((totalComments / sumViews) * 100).toFixed(1) : '0.0';
    const likeToViewRate = sumViews > 0 ? ((totalVideoLikes / sumViews) * 100).toFixed(1) : '0.0';
    const creatorPublishFrequency = totalCreators > 0 ? (totalVideos / totalCreators).toFixed(1) : '0.0';

    return apiSuccess({
      stats: {
        totalUsers,
        totalCreators,
        totalVideos,
        readyVideos,
        totalComments,
        totalVideoLikes,
        totalCreatorRatings,
        totalViews: sumViews,
        trends: {
          users: userTrend,
          creators: creatorTrend,
          videos: videoTrend,
        },
        analytics: {
          users7d,
          creators7d,
          videos7d,
          avgWatchCompletion: avgWatchPct,
          commentToViewRate: `${commentToViewRate}%`,
          likeToViewRate: `${likeToViewRate}%`,
          creatorPublishFrequency: `${creatorPublishFrequency} videos / creator`,
          genreDistribution,
        },
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
