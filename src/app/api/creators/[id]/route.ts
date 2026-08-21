import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import {
  checkCreatorRatingEligibility,
  calculateCreatorRatingSummary,
} from '@/lib/rating-eligibility';
import { z } from 'zod';

const creatorPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(request);
  const { id } = await params;

  try {
    let creator = await db.creatorProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            bio: true,
            avatarUrl: true,
            gender: true,
            website: true,
            instagram: true,
            youtube: true,
            twitter: true,
            contactEmail: true,
            status: true,
          },
        },
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
            pinnedCommentId: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { likes: true, comments: { where: { status: 'VISIBLE' } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // If not found as creator, check if it is a regular user (consumer)
    if (!creator) {
      const regularUser = await db.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          gender: true,
          website: true,
          instagram: true,
          youtube: true,
          twitter: true,
          contactEmail: true,
          status: true,
        },
      });

      if (!regularUser || regularUser.status !== 'ACTIVE') {
        return apiError('CREATOR_NOT_FOUND');
      }

      const [followerCount, followingCount, isFollowingRecord] = await Promise.all([
        db.follow.count({ where: { followingId: regularUser.id } }),
        db.follow.count({ where: { followerId: regularUser.id } }),
        user
          ? db.follow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: user.id,
                  followingId: regularUser.id,
                },
              },
            })
          : null,
      ]);

      return apiSuccess({
        creator: {
          id: regularUser.id,
          userId: regularUser.id,
          creatorName: regularUser.username || regularUser.displayName,
          displayName: regularUser.displayName || 'User',
          username: regularUser.username || regularUser.displayName.toLowerCase().replace(/[^a-z0-9_]/g, ''),
          description: regularUser.bio || '',
          bio: regularUser.bio || '',
          avatarUrl: regularUser.avatarUrl || null,
          gender: regularUser.gender || 'PREFER_NOT_TO_SAY',
          website: regularUser.website || null,
          instagram: regularUser.instagram || null,
          youtube: regularUser.youtube || null,
          twitter: regularUser.twitter || null,
          contactEmail: regularUser.contactEmail || null,
        },
        stats: {
          postCount: 0,
          videoCount: 0,
          followerCount,
          followingCount,
          isFollowing: !!isFollowingRecord,
          totalViews: 0,
          averageRating: 0,
          totalRatings: 0,
          userRating: null,
          userReview: null,
          ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        },
        reviews: [],
        videos: {
          data: [],
          pagination: {
            page: 1,
            limit: 30,
            total: 0,
            totalPages: 1,
          },
        },
      });
    }

    if (creator.user.status !== 'ACTIVE') return apiError('CREATOR_NOT_FOUND');

    const { searchParams } = new URL(request.url);
    const pagination = creatorPaginationSchema.safeParse(Object.fromEntries(searchParams));
    const { page, limit } = pagination.success ? pagination.data : { page: 1, limit: 30 };

    // Compute stats
    const totalViews = creator.videos.reduce((sum, v) => sum + v.viewCount, 0);
    const videoCount = creator.videos.length;

    // Follower and Following counts, plus rating eligibility & summary
    const [followerCount, followingCount, isFollowingRecord, eligibility, summary] = await Promise.all([
      db.follow.count({ where: { followingId: creator.userId } }),
      db.follow.count({ where: { followerId: creator.userId } }),
      user
        ? db.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: user.id,
                followingId: creator.userId,
              },
            },
          })
        : null,
      checkCreatorRatingEligibility(user?.id, creator.id),
      calculateCreatorRatingSummary(creator.id),
    ]);

    // Pagination for videos
    const paginatedVideos = creator.videos.slice(
      (page - 1) * limit,
      page * limit
    );

    return apiSuccess({
      creator: {
        id: creator.id,
        userId: creator.userId,
        creatorName: creator.creatorName,
        displayName: creator.user.displayName,
        username: creator.user.username || creator.creatorName,
        description: creator.description,
        bio: creator.user.bio || creator.description,
        category: creator.category || 'Comedy',
        categoryChangeCount: creator.categoryChangeCount || 0,
        avatarUrl: creator.user.avatarUrl || null,
        gender: creator.user.gender,
        website: creator.user.website,
        instagram: creator.user.instagram,
        youtube: creator.user.youtube,
        twitter: creator.user.twitter,
        contactEmail: creator.user.contactEmail,
      },
      stats: {
        postCount: videoCount,
        videoCount,
        followerCount,
        followingCount,
        isFollowing: !!isFollowingRecord,
        totalViews,
        averageRating: summary.averageRating,
        totalRatings: summary.totalRatings,
        bayesianScore: summary.bayesianScore,
        confidenceLevel: summary.confidenceLevel,
        isLimitedData: summary.isLimitedData,
        dimensionAverages: summary.dimensionAverages,
        userRating: eligibility.userRating?.overallRating ?? null,
        userReview: eligibility.userRating?.review ?? null,
        ratingBreakdown: summary.ratingBreakdown,
      },
      ratingEligibility: eligibility,
      ratingSummary: summary,
      reviews: summary.reviews,
      videos: {
        data: paginatedVideos.map((v) => ({
          id: v.id,
          title: v.title,
          publisher: v.publisher,
          producer: v.producer,
          genre: v.genre,
          ageRating: v.ageRating,
          description: v.description,
          duration: v.duration,
          status: 'READY' as const,
          viewCount: v.viewCount,
          createdAt: v.createdAt.toISOString(),
          updatedAt: v.updatedAt.toISOString(),
          likeCount: v._count.likes,
          commentCount: v._count.comments,
          pinnedCommentId: v.pinnedCommentId,
          userLiked: false,
          creator: {
            id: creator.id,
            creatorName: creator.creatorName,
            displayName: creator.user.displayName,
            username: creator.user.username || null,
            avatarUrl: creator.user.avatarUrl || null,
          },
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