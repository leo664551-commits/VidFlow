import { NextRequest } from 'next/server';
import type { AuthUser } from '@/types';
import { db } from '@/lib/db';
import { hash, compare } from 'bcryptjs';
import { getServerSession } from 'next-auth';

import type { AuthOptions } from 'next-auth';

// NextAuth options are imported dynamically to avoid circular deps
let authOptions: AuthOptions | undefined;

async function getAuthOptions() {
  if (!authOptions) {
    // Dynamic import to avoid circular dependency
    const mod = await import('@/app/api/auth/[...nextauth]/route');
    authOptions = mod.authOptions;
  }
  return authOptions;
}

export async function getSession(request: NextRequest): Promise<AuthUser | null> {
  try {
    const opts = await getAuthOptions();
    const session = await getServerSession(opts);
    const sessionUser = session as any;

    if (!sessionUser?.user?.email) {
      return null;
    }

    const user = await db.user.findUnique({
      where: { email: sessionUser.user.email as string },
      include: {
        creatorProfile: {
          select: {
            id: true,
            creatorName: true,
            description: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    const username = user.username || user.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') || user.email.split('@')[0];

    return {
      id: user.id,
      email: user.email,
      username,
      displayName: user.displayName,
      role: user.role as AuthUser['role'],
      status: user.status as AuthUser['status'],
      bio: user.bio || user.creatorProfile?.description || '',
      avatarUrl: user.avatarUrl || null,
      gender: user.gender || 'PREFER_NOT_TO_SAY',
      website: user.website || null,
      instagram: user.instagram || null,
      youtube: user.youtube || null,
      twitter: user.twitter || null,
      contactEmail: user.contactEmail || null,
      category: user.category || 'Comedy',
      categoryChangeCount: user.categoryChangeCount || 0,
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
      creatorProfile: user.creatorProfile
        ? {
            id: user.creatorProfile.id,
            creatorName: user.creatorProfile.creatorName,
            description: user.creatorProfile.description,
          }
        : null,
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}
