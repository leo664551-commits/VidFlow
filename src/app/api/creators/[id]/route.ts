import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getContainer } from '@/lib/cosmos';
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
    const creatorsContainer = getContainer('creatorProfiles');
    if (creatorsContainer) {
      const { resources: profiles } = await creatorsContainer.items.query<Record<string, any>>({
        query: 'SELECT * FROM c WHERE c.id = @id OR c.userId = @id',
        parameters: [{ name: '@id', value: id }]
      }).fetchAll();
      
      let creatorProfile: Record<string, any> | null = profiles[0] || null;
      const usersContainer = getContainer('users');

      if (!creatorProfile) {
        let regularUser: Record<string, any> | null = null;
        if (usersContainer) {
          const { resources } = await usersContainer.items.query<Record<string, any>>({
            query: 'SELECT * FROM c WHERE c.id = @id',
            parameters: [{ name: '@id', value: id }]
          }).fetchAll();
          regularUser = resources[0] || null;
        }

        if (!regularUser || regularUser.status !== 'ACTIVE') {
          return apiError('CREATOR_NOT_FOUND');
        }

        let followerCount = 0;
        let followingCount = 0;
        let isFollowingRecord = false;

        const followsContainer = getContainer('follows');
        if (followsContainer) {
          const { resources: followers } = await followsContainer.items.query<number>({
            query: 'SELECT VALUE COUNT(1) FROM c WHERE c.followingId = @userId',
            parameters: [{ name: '@userId', value: regularUser.id }]
          }).fetchAll();
          followerCount = followers[0] || 0;

          const { resources: followings } = await followsContainer.items.query<number>({
            query: 'SELECT VALUE COUNT(1) FROM c WHERE c.followerId = @userId',
            parameters: [{ name: '@userId', value: regularUser.id }]
          }).fetchAll();
          followingCount = followings[0] || 0;

          if (user) {
            const { resources } = await followsContainer.items.query({
              query: 'SELECT * FROM c WHERE c.followerId = @followerId AND c.followingId = @followingId',
              parameters: [
                { name: '@followerId', value: user.id },
                { name: '@followingId', value: regularUser.id }
              ]
            }).fetchAll();
            isFollowingRecord = resources.length > 0;
          }
        }

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
            isFollowing: isFollowingRecord,
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

      let creatorUser: Record<string, any> | null = null;
      if (usersContainer) {
        const { resources } = await usersContainer.items.query<Record<string, any>>({
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: creatorProfile.userId }]
        }).fetchAll();
        creatorUser = resources[0] || null;
      }

      if (!creatorUser || creatorUser.status !== 'ACTIVE') return apiError('CREATOR_NOT_FOUND');

      const { searchParams } = new URL(request.url);
      const pagination = creatorPaginationSchema.safeParse(Object.fromEntries(searchParams));
      const { page, limit } = pagination.success ? pagination.data : { page: 1, limit: 30 };

      const videosContainer = getContainer('videos');
      let creatorVideos: Array<Record<string, any>> = [];
      if (videosContainer) {
        const { resources } = await videosContainer.items.query<Record<string, any>>({
          query: 'SELECT * FROM c WHERE c.creatorId = @userId AND c.status = "READY" ORDER BY c.createdAt DESC',
          parameters: [{ name: '@userId', value: creatorProfile.userId }]
        }).fetchAll();
        creatorVideos = resources;
      }

      const totalViews = creatorVideos.reduce((sum, v) => sum + (v.viewCount || 0), 0);
      const videoCount = creatorVideos.length;

      let followerCount = 0;
      let followingCount = 0;
      let isFollowingRecord = false;
      const followsContainer = getContainer('follows');
      
      if (followsContainer) {
        const { resources: followers } = await followsContainer.items.query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.followingId = @userId',
          parameters: [{ name: '@userId', value: creatorProfile.userId }]
        }).fetchAll();
        followerCount = followers[0] || 0;

        const { resources: followings } = await followsContainer.items.query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.followerId = @userId',
          parameters: [{ name: '@userId', value: creatorProfile.userId }]
        }).fetchAll();
        followingCount = followings[0] || 0;

        if (user) {
          const { resources } = await followsContainer.items.query({
            query: 'SELECT * FROM c WHERE c.followerId = @followerId AND c.followingId = @followingId',
            parameters: [
              { name: '@followerId', value: user.id },
              { name: '@followingId', value: creatorProfile.userId }
            ]
          }).fetchAll();
          isFollowingRecord = resources.length > 0;
        }
      }

      const [eligibility, summary] = await Promise.all([
        checkCreatorRatingEligibility(user?.id, creatorProfile.id),
        calculateCreatorRatingSummary(creatorProfile.id),
      ]);

      const paginatedVideos = creatorVideos.slice((page - 1) * limit, page * limit);
      
      let userLikedVideoIds = new Set<string>();
      const videoLikesContainer = getContainer('videoLikes');
      
      if (user && paginatedVideos.length > 0 && videoLikesContainer) {
        const videoIds = paginatedVideos.map(v => `'${v.id}'`).join(',');
        const { resources } = await videoLikesContainer.items.query({
          query: `SELECT c.videoId FROM c WHERE c.userId = @userId AND c.videoId IN (${videoIds})`,
          parameters: [{ name: '@userId', value: user.id }]
        }).fetchAll();
        userLikedVideoIds = new Set(resources.map(r => r.videoId));
      }

      const commentsContainer = getContainer('comments');

      const videosData = await Promise.all(paginatedVideos.map(async (v) => {
        let likeCount = 0;
        let commentCount = 0;
        
        if (videoLikesContainer) {
          const { resources } = await videoLikesContainer.items.query({
            query: 'SELECT VALUE COUNT(1) FROM c WHERE c.videoId = @videoId',
            parameters: [{ name: '@videoId', value: v.id }]
          }).fetchAll();
          likeCount = resources[0] || 0;
        }
        
        if (commentsContainer) {
          const { resources } = await commentsContainer.items.query({
            query: 'SELECT VALUE COUNT(1) FROM c WHERE c.videoId = @videoId AND c.status = "VISIBLE"',
            parameters: [{ name: '@videoId', value: v.id }]
          }).fetchAll();
          commentCount = resources[0] || 0;
        }

        return {
          id: v.id,
          title: v.title,
          publisher: v.publisher,
          producer: v.producer,
          genre: v.genre,
          ageRating: v.ageRating,
          description: v.description,
          thumbnailBlobName: v.thumbnailBlobName,
          storageBlobName: v.storageBlobName,
          duration: v.duration,
          status: 'READY' as const,
          viewCount: v.viewCount,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
          likeCount,
          commentCount,
          pinnedCommentId: v.pinnedCommentId,
          userLiked: userLikedVideoIds.has(v.id),
          creator: {
            id: creatorProfile.id,
            creatorName: creatorProfile.creatorName,
            displayName: creatorUser.displayName,
            username: creatorUser.username || null,
            avatarUrl: creatorUser.avatarUrl || null,
          },
        };
      }));

      return apiSuccess({
        creator: {
          id: creatorProfile.id,
          userId: creatorProfile.userId,
          creatorName: creatorProfile.creatorName,
          displayName: creatorUser.displayName,
          username: creatorUser.username || creatorProfile.creatorName,
          description: creatorProfile.description,
          bio: creatorUser.bio || creatorProfile.description,
          category: creatorProfile.category || 'Comedy',
          categoryChangeCount: creatorProfile.categoryChangeCount || 0,
          avatarUrl: creatorUser.avatarUrl || null,
          gender: creatorUser.gender,
          website: creatorUser.website,
          instagram: creatorUser.instagram,
          youtube: creatorUser.youtube,
          twitter: creatorUser.twitter,
          contactEmail: creatorUser.contactEmail,
        },
        stats: {
          postCount: videoCount,
          videoCount,
          followerCount,
          followingCount,
          isFollowing: isFollowingRecord,
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
          data: videosData,
          pagination: {
            page,
            limit,
            total: videoCount,
            totalPages: Math.ceil(videoCount / limit),
          },
        },
      });

    } else {
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
              storageBlobName: true,
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

      const totalViews = creator.videos.reduce((sum, v) => sum + v.viewCount, 0);
      const videoCount = creator.videos.length;

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

      const paginatedVideos = creator.videos.slice((page - 1) * limit, page * limit);

      let userLikedVideoIds = new Set<string>();
      if (user && paginatedVideos.length > 0) {
        const likes = await db.videoLike.findMany({
          where: {
            userId: user.id,
            videoId: { in: paginatedVideos.map((v) => v.id) },
          },
          select: { videoId: true },
        });
        userLikedVideoIds = new Set(likes.map((l) => l.videoId));
      }

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
            thumbnailBlobName: v.thumbnailBlobName,
            storageBlobName: v.storageBlobName,
            duration: v.duration,
            status: 'READY' as const,
            viewCount: v.viewCount,
            createdAt: v.createdAt.toISOString(),
            updatedAt: v.updatedAt.toISOString(),
            likeCount: v._count.likes,
            commentCount: v._count.comments,
            pinnedCommentId: v.pinnedCommentId,
            userLiked: userLikedVideoIds.has(v.id),
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
    }
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}