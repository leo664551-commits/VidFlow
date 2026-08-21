import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  const [fullUser, followerCount, followingCount, postCount] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      include: {
        creatorProfile: {
          select: { id: true, creatorName: true, description: true, createdAt: true },
        },
      },
    }),
    db.follow.count({ where: { followingId: user.id } }),
    db.follow.count({ where: { followerId: user.id } }),
    db.video.count({ where: { creatorId: user.id } }),
  ]);

  if (!fullUser) return apiError('USER_NOT_FOUND');

  // If user doesn't have a username yet, derive a default one
  const username = fullUser.username || fullUser.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') || fullUser.email.split('@')[0];

  return apiSuccess({
    id: fullUser.id,
    email: fullUser.email,
    username,
    displayName: fullUser.displayName,
    role: fullUser.role,
    status: fullUser.status,
    bio: fullUser.bio || fullUser.creatorProfile?.description || '',
    avatarUrl: fullUser.avatarUrl || null,
    gender: fullUser.gender || 'PREFER_NOT_TO_SAY',
    website: fullUser.website || null,
    instagram: fullUser.instagram || null,
    youtube: fullUser.youtube || null,
    twitter: fullUser.twitter || null,
    contactEmail: fullUser.contactEmail || null,
    category: fullUser.category || 'Comedy',
    categoryChangeCount: fullUser.categoryChangeCount || 0,
    followerCount,
    followingCount,
    postCount,
    creatorProfile: fullUser.creatorProfile,
    createdAt: fullUser.createdAt,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  try {
    const body = await request.json();
    const {
      displayName,
      username,
      bio,
      avatarUrl,
      gender,
      website,
      instagram,
      youtube,
      twitter,
      contactEmail,
      category,
    } = body;

    const dataToUpdate: Record<string, unknown> = {};

    // 1. Validate and check unique username
    if (typeof username === 'string') {
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return apiError('VALIDATION_ERROR', 'Username must be between 3 and 30 characters');
      }

      if (!/^[a-z0-9_.]+$/.test(cleanUsername)) {
        return apiError('VALIDATION_ERROR', 'Username can only contain letters, numbers, underscores, and dots');
      }

      // Check if another user already has this username
      const existingUser = await db.user.findFirst({
        where: {
          username: cleanUsername,
          NOT: { id: user.id },
        },
      });

      if (existingUser) {
        return apiError('CONFLICT', `Username @${cleanUsername} is already taken by another user`);
      }

      dataToUpdate.username = cleanUsername;
    }

    if (typeof displayName === 'string' && displayName.trim().length >= 1) {
      dataToUpdate.displayName = displayName.trim().slice(0, 100);
    }
    if (typeof bio === 'string') {
      dataToUpdate.bio = bio.slice(0, 500);
    }
    if (typeof avatarUrl === 'string' || avatarUrl === null) {
      dataToUpdate.avatarUrl = avatarUrl;
    }
    if (typeof gender === 'string') {
      dataToUpdate.gender = gender;
    }
    if (typeof website === 'string' || website === null) {
      dataToUpdate.website = website ? website.trim().slice(0, 200) : null;
    }
    if (typeof instagram === 'string' || instagram === null) {
      dataToUpdate.instagram = instagram ? instagram.trim().replace(/^@/, '').slice(0, 100) : null;
    }
    if (typeof youtube === 'string' || youtube === null) {
      dataToUpdate.youtube = youtube ? youtube.trim().slice(0, 100) : null;
    }
    if (typeof twitter === 'string' || twitter === null) {
      dataToUpdate.twitter = twitter ? twitter.trim().replace(/^@/, '').slice(0, 100) : null;
    }
    if (typeof contactEmail === 'string' || contactEmail === null) {
      dataToUpdate.contactEmail = contactEmail ? contactEmail.trim().slice(0, 150) : null;
    }

    // Category update with lifetime 2-change limit
    if (typeof category === 'string' && category.trim().length > 0) {
      const cleanCategory = category.trim().slice(0, 50);
      const currentUser = await db.user.findUnique({
        where: { id: user.id },
        select: { category: true, categoryChangeCount: true },
      });

      if (currentUser && currentUser.category !== cleanCategory) {
        if (currentUser.categoryChangeCount >= 2) {
          return apiError(
            'VALIDATION_ERROR',
            'You have reached the maximum limit of 2 category changes allowed in a lifetime.'
          );
        }
        dataToUpdate.category = cleanCategory;
        dataToUpdate.categoryChangeCount = { increment: 1 };
      }
    }

    const [updated, followerCount, followingCount, postCount] = await Promise.all([
      db.user.update({
        where: { id: user.id },
        data: dataToUpdate,
        include: { creatorProfile: true },
      }),
      db.follow.count({ where: { followingId: user.id } }),
      db.follow.count({ where: { followerId: user.id } }),
      db.video.count({ where: { creatorId: user.id } }),
    ]);

    // If bio, name, or category changed and user is creator, sync creatorProfile
    if (updated.creatorProfile) {
      const creatorUpdate: Record<string, unknown> = {};
      if (typeof bio === 'string') creatorUpdate.description = bio.slice(0, 500);
      if (typeof displayName === 'string') creatorUpdate.creatorName = displayName.trim().slice(0, 100);
      if (typeof dataToUpdate.category === 'string') {
        creatorUpdate.category = dataToUpdate.category;
        creatorUpdate.categoryChangeCount = { increment: 1 };
      }

      if (Object.keys(creatorUpdate).length > 0) {
        await db.creatorProfile.update({
          where: { userId: user.id },
          data: creatorUpdate,
        });
      }
    }

    return apiSuccess({
      id: updated.id,
      email: updated.email,
      username: updated.username || updated.displayName.toLowerCase().replace(/[^a-z0-9_]/g, ''),
      displayName: updated.displayName,
      role: updated.role,
      status: updated.status,
      bio: updated.bio || '',
      avatarUrl: updated.avatarUrl || null,
      gender: updated.gender || 'PREFER_NOT_TO_SAY',
      website: updated.website || null,
      instagram: updated.instagram || null,
      youtube: updated.youtube || null,
      twitter: updated.twitter || null,
      contactEmail: updated.contactEmail || null,
      category: updated.category || 'Comedy',
      categoryChangeCount: updated.categoryChangeCount || 0,
      followerCount,
      followingCount,
      postCount,
      creatorProfile: updated.creatorProfile,
    });
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}