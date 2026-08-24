import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiError } from '@/lib/api-response';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionUser = await getSession(request);

  try {
    const videoContainer = getContainer('videos');
    const shareContainer = getContainer('videoShares');

    if (videoContainer && shareContainer) {
      const { resources: videos } = await videoContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: id }]
        })
        .fetchAll();

      const video = videos[0];
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

      const shareId = uuidv4();
      await shareContainer.items.create({
        id: shareId,
        videoId: video.id,
        userId: sessionUser?.id || null,
        platform,
        createdAt: new Date().toISOString()
      });

      const { resources: countResult } = await shareContainer.items
        .query({
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.videoId = @videoId',
          parameters: [{ name: '@videoId', value: video.id }]
        })
        .fetchAll();
      const totalShares = countResult[0] || 0;

      return apiSuccess({
        recorded: true,
        id: shareId,
        totalShares,
      });
    } else {
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
    }
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
