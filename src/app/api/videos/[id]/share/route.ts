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
    const video = await db.video.findUnique({
      where: { id },
      select: { id: true, creatorId: true },
    });

    if (!video) {
      return apiError('NOT_FOUND', 'Video not found');
    }

    let platform = 'LINK';
    try {
      const body = await request.json();
      if (body && typeof body.platform === 'string') {
        platform = body.platform.slice(0, 32).toUpperCase();
      }
    } catch {
      // Body is optional, default to LINK
    }

    const share = await db.videoShare.create({
      data: {
        videoId: video.id,
        userId: sessionUser?.id || null,
        platform,
      },
    });

    const totalShares = await db.videoShare.count({
      where: { videoId: video.id },
    });

    return apiSuccess({
      recorded: true,
      id: share.id,
      totalShares,
    });
  } catch {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
