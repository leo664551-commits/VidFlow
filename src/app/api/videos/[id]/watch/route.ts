import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';

const watchSchema = z.object({
  watchDuration: z.number().min(0),
  videoDuration: z.number().min(0).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(request);
  const { id } = await params;

  try {
    const video = await db.video.findUnique({
      where: { id },
      select: { id: true, creatorId: true, duration: true, viewCount: true },
    });

    if (!video) {
      return apiError('VIDEO_NOT_FOUND', 'Video not found');
    }

    const body = await request.json().catch(() => ({}));
    const parsed = watchSchema.safeParse(body);
    const rawWatchDuration = parsed.success ? parsed.data.watchDuration : 0;
    const rawVideoDuration = parsed.success && parsed.data.videoDuration ? parsed.data.videoDuration : (video.duration || 30);

    const videoDuration = Math.max(1, rawVideoDuration);
    const watchDuration = Math.min(videoDuration * 2, Math.max(0, rawWatchDuration));
    const completionPercentage = Math.min(1.0, Math.round((watchDuration / videoDuration) * 100) / 100);

    if (user) {
      const existing = await db.videoWatch.findUnique({
        where: {
          userId_videoId: {
            userId: user.id,
            videoId: id,
          },
        },
      });

      if (existing) {
        await db.videoWatch.update({
          where: { id: existing.id },
          data: {
            watchDuration: Math.max(existing.watchDuration, watchDuration),
            videoDuration,
            completionPercentage: Math.max(existing.completionPercentage, completionPercentage),
            lastWatchedAt: new Date(),
          },
        });
      } else {
        await db.videoWatch.create({
          data: {
            userId: user.id,
            videoId: id,
            creatorId: video.creatorId,
            watchDuration,
            videoDuration,
            completionPercentage,
            lastWatchedAt: new Date(),
          },
        });
      }

      // Record a VideoView if not already logged recently
      await db.videoView.create({
        data: {
          videoId: id,
          userId: user.id,
        },
      });
    }

    // Increment overall video viewCount
    await db.video.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return apiSuccess({
      videoId: id,
      watchDuration,
      videoDuration,
      completionPercentage,
      qualifying: completionPercentage >= 0.5,
    });
  } catch (error) {
    console.error('Error logging video watch:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
