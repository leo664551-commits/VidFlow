import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  const fullUser = await db.user.findUnique({
    where: { id: user.id },
    include: {
      creatorProfile: {
        select: { id: true, creatorName: true, description: true, createdAt: true },
      },
    },
  });

  if (!fullUser) return apiError('USER_NOT_FOUND');

  return apiSuccess({
    id: fullUser.id,
    email: fullUser.email,
    displayName: fullUser.displayName,
    role: fullUser.role,
    status: fullUser.status,
    creatorProfile: fullUser.creatorProfile,
    createdAt: fullUser.createdAt,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  try {
    const body = await request.json();
    const displayName = body.displayName;

    if (typeof displayName !== 'string' || displayName.length < 1 || displayName.length > 100) {
      return apiError('VALIDATION_ERROR', 'Display name must be between 1 and 100 characters');
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: { displayName },
    });

    return apiSuccess({
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
      status: updated.status,
    });
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
