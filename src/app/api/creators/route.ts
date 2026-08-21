import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || searchParams.get('query') || '').trim();
  const cleanQuery = query.replace(/^@/, '');

  try {
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
  } catch {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
