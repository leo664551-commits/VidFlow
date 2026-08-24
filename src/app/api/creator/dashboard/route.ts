import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { calculateCreatorRatingSummary } from '@/lib/rating-eligibility';
import { getContainer } from '@/lib/cosmos';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CREATOR') return apiError('FORBIDDEN');
  if (!user.creatorProfile) return apiError('FORBIDDEN', 'No creator profile found');

  try {
    const creatorId = user.id;
    const videosContainer = getContainer('videos');

    if (videosContainer) {
      // ===== Cosmos DB path =====
      const { resources: allVideos } = await videosContainer.items
        .query({ query: 'SELECT * FROM c WHERE c.creatorId = @cid ORDER BY c.createdAt DESC', parameters: [{ name: '@cid', value: creatorId }] })
        .fetchAll();

      const totalVideos = allVideos.length;
      const publishedVideos = allVideos.filter((v: Record<string, unknown>) => v.status === 'READY').length;
      const processingVideos = allVideos.filter((v: Record<string, unknown>) => v.status === 'PROCESSING').length;
      const failedVideos = allVideos.filter((v: Record<string, unknown>) => v.status === 'FAILED').length;
      const totalViews = allVideos.reduce((sum: number, v: Record<string, unknown>) => sum + ((v.viewCount as number) || 0), 0);
      const totalLikes = allVideos.reduce((sum: number, v: Record<string, unknown>) => sum + ((v.likeCount as number) || 0), 0);
      const totalComments = allVideos.reduce((sum: number, v: Record<string, unknown>) => sum + ((v.commentCount as number) || 0), 0);

      // Get follower/following counts
      let followerCount = 0;
      let followingCount = 0;
      const followsContainer = getContainer('follows');
      if (followsContainer) {
        const { resources: followers } = await followsContainer.items
          .query({ query: 'SELECT VALUE COUNT(1) FROM c WHERE c.followingId = @uid', parameters: [{ name: '@uid', value: creatorId }] })
          .fetchAll();
        const { resources: following } = await followsContainer.items
          .query({ query: 'SELECT VALUE COUNT(1) FROM c WHERE c.followerId = @uid', parameters: [{ name: '@uid', value: creatorId }] })
          .fetchAll();
        followerCount = followers[0] || 0;
        followingCount = following[0] || 0;
      }

      const recentVideos = allVideos.slice(0, 6).map((v: Record<string, unknown>) => ({
        id: v.id,
        title: v.title,
        publisher: v.publisher,
        producer: v.producer,
        genre: v.genre,
        ageRating: v.ageRating,
        status: v.status,
        viewCount: v.viewCount || 0,
        likeCount: v.likeCount || 0,
        commentCount: v.commentCount || 0,
        storageBlobName: v.storageBlobName,
        thumbnailBlobName: v.thumbnailBlobName,
        duration: v.duration,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      }));

      // Build empty follower timeline (no detailed follower data in simple query)
      const now = new Date();
      const followerTimeline: Array<{ date: string; followers: number }> = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        followerTimeline.push({
          date: `${monthNames[d.getMonth()]} ${d.getDate()}`,
          followers: followerCount,
        });
      }

      let ratingSummary;
      try {
        ratingSummary = await calculateCreatorRatingSummary(user.creatorProfile.id);
      } catch {
        ratingSummary = { totalRatings: 0, averageRating: 0, bayesianScore: 0, confidenceLevel: 'none', isLimitedData: true, dimensionAverages: {}, ratingBreakdown: [] };
      }

      return apiSuccess({
        totalVideos,
        publishedVideos,
        processingVideos,
        failedVideos,
        totalViews,
        totalComments,
        totalLikes,
        followerCount,
        followingCount,
        profileViews: 0,
        uniqueViewers: 0,
        sharesCount: 0,
        followerTimeline,
        demographics: { hasData: false, totalFollowers: followerCount, gender: { male: 0, female: 0, other: 0 } },
        stats: {
          totalVideos, readyVideos: publishedVideos, publishedVideos, processingVideos, failedVideos,
          totalViews, totalComments, totalLikes, followerCount, followingCount,
          profileViews: 0, uniqueViewers: 0, sharesCount: 0,
          totalRatings: ratingSummary.totalRatings, averageRating: ratingSummary.averageRating,
          bayesianScore: ratingSummary.bayesianScore, confidenceLevel: ratingSummary.confidenceLevel,
          isLimitedData: ratingSummary.isLimitedData, dimensionAverages: ratingSummary.dimensionAverages,
          ratingBreakdown: ratingSummary.ratingBreakdown,
        },
        creatorUser: { bio: user.bio, displayName: user.displayName },
        creatorProfile: {
          ...user.creatorProfile,
          bio: user.bio || user.creatorProfile.description,
          displayName: user.displayName,
        },
        recentVideos,
        recentComments: [],
        ratings: ratingSummary,
      });
    }

    // ===== Prisma fallback =====
    const [
      totalVideos, publishedVideos, processingVideos, failedVideos,
      totalViews, totalComments, totalLikes,
      followerCount, followingCount, profileViews, sharesCount,
      uniqueViewersGroup, creatorUser, recentVideos, recentComments, allFollowers,
    ] = await Promise.all([
      db.video.count({ where: { creatorId } }),
      db.video.count({ where: { creatorId, status: 'READY' } }),
      db.video.count({ where: { creatorId, status: 'PROCESSING' } }),
      db.video.count({ where: { creatorId, status: 'FAILED' } }),
      db.video.aggregate({ where: { creatorId }, _sum: { viewCount: true } }),
      db.comment.count({ where: { video: { creatorId } } }),
      db.videoLike.count({ where: { video: { creatorId } } }),
      db.follow.count({ where: { followingId: creatorId } }),
      db.follow.count({ where: { followerId: creatorId } }),
      db.profileView.count({ where: { profileUserId: creatorId } }),
      db.videoShare.count({ where: { video: { creatorId } } }),
      db.videoWatch.groupBy({ by: ['userId'], where: { creatorId } }),
      db.user.findUnique({ where: { id: creatorId }, select: { bio: true, displayName: true } }),
      db.video.findMany({
        where: { creatorId }, orderBy: { createdAt: 'desc' }, take: 6,
        include: { creator: { select: { id: true, creatorName: true } }, _count: { select: { likes: true, comments: true } } },
      }),
      db.comment.findMany({
        where: { video: { creatorId }, status: 'VISIBLE' }, orderBy: { createdAt: 'desc' }, take: 6,
        include: { user: { select: { id: true, displayName: true, username: true, avatarUrl: true } }, video: { select: { id: true, title: true, genre: true } } },
      }),
      db.follow.findMany({
        where: { followingId: creatorId },
        include: { follower: { select: { id: true, gender: true, createdAt: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const sumViews = totalViews._sum.viewCount || 0;
    const uniqueViewers = uniqueViewersGroup.length;

    const now = new Date();
    const followerTimeline: Array<{ date: string; followers: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      d.setHours(23, 59, 59, 999);
      const countUpToDate = allFollowers.filter((f) => new Date(f.createdAt) <= d).length;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      followerTimeline.push({ date: `${monthNames[d.getMonth()]} ${d.getDate()}`, followers: countUpToDate });
    }

    let maleFollowers = 0, femaleFollowers = 0, otherFollowers = 0;
    allFollowers.forEach((f) => {
      const g = (f.follower.gender || '').toUpperCase();
      if (g === 'MALE') maleFollowers++;
      else if (g === 'FEMALE') femaleFollowers++;
      else otherFollowers++;
    });
    const totalFollowersCount = allFollowers.length;
    const demographics = {
      hasData: totalFollowersCount > 0, totalFollowers: totalFollowersCount,
      gender: {
        male: totalFollowersCount > 0 ? Math.round((maleFollowers / totalFollowersCount) * 100) : 0,
        female: totalFollowersCount > 0 ? Math.round((femaleFollowers / totalFollowersCount) * 100) : 0,
        other: totalFollowersCount > 0 ? Math.round((otherFollowers / totalFollowersCount) * 100) : 0,
      },
    };

    const ratingSummary = await calculateCreatorRatingSummary(user.creatorProfile.id);

    return apiSuccess({
      totalVideos, publishedVideos, processingVideos, failedVideos,
      totalViews: sumViews, totalComments, totalLikes,
      followerCount, followingCount, profileViews, uniqueViewers, sharesCount,
      followerTimeline, demographics,
      stats: {
        totalVideos, readyVideos: publishedVideos, publishedVideos, processingVideos, failedVideos,
        totalViews: sumViews, totalComments, totalLikes, followerCount, followingCount,
        profileViews, uniqueViewers, sharesCount,
        totalRatings: ratingSummary.totalRatings, averageRating: ratingSummary.averageRating,
        bayesianScore: ratingSummary.bayesianScore, confidenceLevel: ratingSummary.confidenceLevel,
        isLimitedData: ratingSummary.isLimitedData, dimensionAverages: ratingSummary.dimensionAverages,
        ratingBreakdown: ratingSummary.ratingBreakdown,
      },
      creatorUser,
      creatorProfile: { ...user.creatorProfile, bio: creatorUser?.bio || user.creatorProfile.description, displayName: creatorUser?.displayName || user.displayName },
      recentVideos: recentVideos.map((v) => ({ ...v, likeCount: v._count?.likes ?? 0, commentCount: v._count?.comments ?? 0, createdAt: v.createdAt.toISOString(), updatedAt: v.updatedAt.toISOString() })),
      recentComments: recentComments.map((c) => ({ id: c.id, content: c.content, createdAt: c.createdAt.toISOString(), user: c.user, video: c.video })),
      ratings: ratingSummary,
    });
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
