import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  try {
    const usersContainer = getContainer('users');
    if (usersContainer) {
      const { resources: users } = await usersContainer.items.query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: user.id }]
      }).fetchAll();
      
      const fullUser: Record<string, any> = users[0];
      if (!fullUser) return apiError('USER_NOT_FOUND');

      const creatorsContainer = getContainer('creatorProfiles');
      let creatorProfile: Record<string, any> | null = null;
      if (creatorsContainer) {
        const { resources } = await creatorsContainer.items.query<Record<string, any>>({
          query: 'SELECT c.id, c.creatorName, c.description, c.createdAt FROM c WHERE c.userId = @userId',
          parameters: [{ name: '@userId', value: user.id }]
        }).fetchAll();
        creatorProfile = resources[0] || null;
      }

      let followerCount = 0;
      let followingCount = 0;
      const followsContainer = getContainer('follows');
      if (followsContainer) {
        const { resources: followers } = await followsContainer.items.query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.followingId = @userId',
          parameters: [{ name: '@userId', value: user.id }]
        }).fetchAll();
        followerCount = followers[0] || 0;

        const { resources: followings } = await followsContainer.items.query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.followerId = @userId',
          parameters: [{ name: '@userId', value: user.id }]
        }).fetchAll();
        followingCount = followings[0] || 0;
      }

      let postCount = 0;
      const videosContainer = getContainer('videos');
      if (videosContainer) {
        const { resources: videos } = await videosContainer.items.query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.creatorId = @userId',
          parameters: [{ name: '@userId', value: user.id }]
        }).fetchAll();
        postCount = videos[0] || 0;
      }

      const username = fullUser.username || fullUser.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') || fullUser.email.split('@')[0];

      return apiSuccess({
        id: fullUser.id,
        email: fullUser.email,
        username,
        displayName: fullUser.displayName,
        role: fullUser.role,
        status: fullUser.status,
        bio: fullUser.bio || creatorProfile?.description || '',
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
        creatorProfile,
        createdAt: fullUser.createdAt,
      });

    } else {
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
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
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

    const usersContainer = getContainer('users');
    if (usersContainer) {
      const { resources: existingUsers } = await usersContainer.items.query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: user.id }]
      }).fetchAll();
      const currentUser = existingUsers[0];
      if (!currentUser) return apiError('USER_NOT_FOUND');

      const dataToUpdate: Record<string, unknown> = {};

      if (typeof username === 'string') {
        const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
        if (cleanUsername.length < 3 || cleanUsername.length > 30) {
          return apiError('VALIDATION_ERROR', 'Username must be between 3 and 30 characters');
        }
        if (!/^[a-z0-9_.]+$/.test(cleanUsername)) {
          return apiError('VALIDATION_ERROR', 'Username can only contain letters, numbers, underscores, and dots');
        }

        const { resources: usernameConflicts } = await usersContainer.items.query({
          query: 'SELECT * FROM c WHERE c.username = @username AND c.id != @id',
          parameters: [
            { name: '@username', value: cleanUsername },
            { name: '@id', value: user.id }
          ]
        }).fetchAll();

        if (usernameConflicts.length > 0) {
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

      if (typeof category === 'string' && category.trim().length > 0) {
        const cleanCategory = category.trim().slice(0, 50);
        if (currentUser.category !== cleanCategory) {
          if ((currentUser.categoryChangeCount || 0) >= 2) {
            return apiError(
              'VALIDATION_ERROR',
              'You have reached the maximum limit of 2 category changes allowed in a lifetime.'
            );
          }
          dataToUpdate.category = cleanCategory;
          dataToUpdate.categoryChangeCount = (currentUser.categoryChangeCount || 0) + 1;
        }
      }

      const updatedUser = { ...currentUser, ...dataToUpdate, updatedAt: new Date().toISOString() };
      await usersContainer.item(user.id, user.id).replace(updatedUser);

      const creatorsContainer = getContainer('creatorProfiles');
      let creatorProfile = null;
      if (creatorsContainer) {
        const { resources: profiles } = await creatorsContainer.items.query({
          query: 'SELECT * FROM c WHERE c.userId = @userId',
          parameters: [{ name: '@userId', value: user.id }]
        }).fetchAll();
        
        if (profiles.length > 0) {
          const profile = profiles[0];
          const creatorUpdate: Record<string, unknown> = {};
          if (typeof bio === 'string') creatorUpdate.description = bio.slice(0, 500);
          if (typeof displayName === 'string') creatorUpdate.creatorName = displayName.trim().slice(0, 100);
          if (typeof dataToUpdate.category === 'string') {
            creatorUpdate.category = dataToUpdate.category;
            creatorUpdate.categoryChangeCount = (profile.categoryChangeCount || 0) + 1;
          }

          if (Object.keys(creatorUpdate).length > 0) {
            const updatedProfile = { ...profile, ...creatorUpdate, updatedAt: new Date().toISOString() };
            await creatorsContainer.item(profile.id, profile.userId).replace(updatedProfile);
            creatorProfile = updatedProfile;
          } else {
            creatorProfile = profile;
          }
        }
      }

      let followerCount = 0;
      let followingCount = 0;
      const followsContainer = getContainer('follows');
      if (followsContainer) {
        const { resources: followers } = await followsContainer.items.query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.followingId = @userId',
          parameters: [{ name: '@userId', value: user.id }]
        }).fetchAll();
        followerCount = followers[0] || 0;

        const { resources: followings } = await followsContainer.items.query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.followerId = @userId',
          parameters: [{ name: '@userId', value: user.id }]
        }).fetchAll();
        followingCount = followings[0] || 0;
      }

      let postCount = 0;
      const videosContainer = getContainer('videos');
      if (videosContainer) {
        const { resources: videos } = await videosContainer.items.query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.creatorId = @userId',
          parameters: [{ name: '@userId', value: user.id }]
        }).fetchAll();
        postCount = videos[0] || 0;
      }

      return apiSuccess({
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username || updatedUser.displayName.toLowerCase().replace(/[^a-z0-9_]/g, ''),
        displayName: updatedUser.displayName,
        role: updatedUser.role,
        status: updatedUser.status,
        bio: updatedUser.bio || '',
        avatarUrl: updatedUser.avatarUrl || null,
        gender: updatedUser.gender || 'PREFER_NOT_TO_SAY',
        website: updatedUser.website || null,
        instagram: updatedUser.instagram || null,
        youtube: updatedUser.youtube || null,
        twitter: updatedUser.twitter || null,
        contactEmail: updatedUser.contactEmail || null,
        category: updatedUser.category || 'Comedy',
        categoryChangeCount: updatedUser.categoryChangeCount || 0,
        followerCount,
        followingCount,
        postCount,
        creatorProfile,
      });

    } else {
      const dataToUpdate: Record<string, unknown> = {};

      if (typeof username === 'string') {
        const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
        
        if (cleanUsername.length < 3 || cleanUsername.length > 30) {
          return apiError('VALIDATION_ERROR', 'Username must be between 3 and 30 characters');
        }
        if (!/^[a-z0-9_.]+$/.test(cleanUsername)) {
          return apiError('VALIDATION_ERROR', 'Username can only contain letters, numbers, underscores, and dots');
        }

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
    }
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}