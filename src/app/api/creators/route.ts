import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || searchParams.get('query') || '').trim();
  const cleanQuery = query.replace(/^@/, '');

  try {
    const container = getContainer('creatorProfiles');
    if (container) {
      const userContainer = getContainer('users');
      const followContainer = getContainer('follows');
      const videoContainer = getContainer('videos');

      let { resources: creators } = await container.items.query({
        query: 'SELECT * FROM c OFFSET 0 LIMIT 20'
      }).fetchAll();

      if (query && userContainer) {
        // Fetch matching users and filter creators
        const { resources: users } = await userContainer.items.query({
          query: 'SELECT * FROM c WHERE c.status = "ACTIVE" AND (CONTAINS(c.username, @cleanQuery) OR CONTAINS(c.displayName, @query) OR CONTAINS(c.bio, @query))',
          parameters: [
            { name: '@cleanQuery', value: cleanQuery },
            { name: '@query', value: query }
          ]
        }).fetchAll();
        const userIds = new Set(users.map(u => u.id));
        creators = creators.filter(c => userIds.has(c.userId) || c.creatorName.includes(query));
      }

      const results = await Promise.all(
        creators.map(async (c) => {
          let user: Record<string, any> | null = null;
          if (userContainer) {
            const { resources } = await userContainer.items.query<Record<string, any>>({
              query: 'SELECT * FROM c WHERE c.id = @userId',
              parameters: [{ name: '@userId', value: c.userId }]
            }).fetchAll();
            user = resources[0] || null;
          }

          let followerCount = 0;
          if (followContainer) {
            const { resources } = await followContainer.items.query<number>({
              query: 'SELECT VALUE COUNT(1) FROM c WHERE c.followingId = @userId',
              parameters: [{ name: '@userId', value: c.userId }]
            }).fetchAll();
            followerCount = resources[0] || 0;
          }

          let videoCount = 0;
          if (videoContainer) {
            const { resources } = await videoContainer.items.query<number>({
              query: 'SELECT VALUE COUNT(1) FROM c WHERE c.creatorId = @userId AND c.status = "READY"',
              parameters: [{ name: '@userId', value: c.userId }]
            }).fetchAll();
            videoCount = resources[0] || 0;
          }

          const u = user || {};

          return {
            id: c.id,
            userId: c.userId,
            creatorName: c.creatorName,
            username: u.username || (u.displayName ? u.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') : ''),
            displayName: u.displayName || c.creatorName,
            bio: u.bio || c.description || '',
            avatarUrl: u.avatarUrl || null,
            gender: u.gender || 'PREFER_NOT_TO_SAY',
            website: u.website || null,
            instagram: u.instagram || null,
            youtube: u.youtube || null,
            twitter: u.twitter || null,
            contactEmail: u.contactEmail || null,
            videoCount,
            followerCount,
          };
        })
      );
      
      // Remove those where user is missing if query filtering needed it
      return apiSuccess(results.slice(0, 20));
    } else {
      const creators = await db.creatorProfile.findMany({
        where: {
          user: {
            status: 'ACTIVE',
            ...(query
              ? {
                  OR: [
                    { username: { contains: cleanQuery } },
                    { displayName: { contains: query } },
                    { bio: { contains: query } },
                    { creatorProfile: { creatorName: { contains: query } } },
                  ],
                }
              : {}),
          },
        },
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
            },
          },
          _count: {
            select: {
              videos: { where: { status: 'READY' } },
            },
          },
        },
        take: 20,
      });

      const results = await Promise.all(
        creators.map(async (c) => {
          const followerCount = await db.follow.count({
            where: { followingId: c.userId },
          });

          return {
            id: c.id,
            userId: c.userId,
            creatorName: c.creatorName,
            username: c.user.username || c.user.displayName.toLowerCase().replace(/[^a-z0-9_]/g, ''),
            displayName: c.user.displayName,
            bio: c.user.bio || c.description || '',
            avatarUrl: c.user.avatarUrl || null,
            gender: c.user.gender || 'PREFER_NOT_TO_SAY',
            website: c.user.website || null,
            instagram: c.user.instagram || null,
            youtube: c.user.youtube || null,
            twitter: c.user.twitter || null,
            contactEmail: c.user.contactEmail || null,
            videoCount: c._count.videos,
            followerCount,
          };
        })
      );

      return apiSuccess(results);
    }
  } catch (err) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
