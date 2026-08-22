import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionUser = await getSession(request);

  try {
    // Find target creator profile or user
    const creator = await db.creatorProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] },
      select: { userId: true },
    });

    const targetUserId = creator?.userId || id;

    // Check user exists
    const userExists = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!userExists) {
      return apiError('NOT_FOUND', 'Target profile not found');
    }

    // Prevent creators from recording profile views on their own profile
    if (sessionUser && sessionUser.id === targetUserId) {
      return apiSuccess({ recorded: false, isSelf: true });
    }

    // Debounce duplicate views from same authenticated viewer within 15 minutes
    if (sessionUser) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const recentView = await db.profileView.findFirst({
        where: {
          profileUserId: targetUserId,
          viewerUserId: sessionUser.id,
          viewedAt: { gte: fifteenMinutesAgo },
        },
      });

      if (recentView) {
        return apiSuccess({ recorded: true, deduped: true });
      }
    }

    // Insert authoritative profile view record
    const viewRecord = await db.profileView.create({
      data: {
        profileUserId: targetUserId,
        viewerUserId: sessionUser?.id || null,
      },
    });

    return apiSuccess({
      recorded: true,
      id: viewRecord.id,
    });
  } catch {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
