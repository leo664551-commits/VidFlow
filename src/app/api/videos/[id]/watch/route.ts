import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

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
    const videoContainer = getContainer('videos');
    const viewContainer = getContainer('videoViews');
    const watchContainer = getContainer('videoWatches');

    if (videoContainer && viewContainer && watchContainer) {
      const { resources: videos } = await videoContainer.items
        .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();
      const video = videos[0];

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

      let isNewViewOccurrence = false;
      const sessionWindowMs = 60 * 1000;
      const windowStart = new Date(Date.now() - sessionWindowMs).toISOString();

      if (user) {
        const { resources: recentViews } = await viewContainer.items.query({
          query: 'SELECT * FROM c WHERE c.videoId = @vid AND c.userId = @uid AND c.viewedAt >= @ws',
          parameters: [
            { name: '@vid', value: id },
            { name: '@uid', value: user.id },
            { name: '@ws', value: windowStart }
          ]
        }).fetchAll();

        if (recentViews.length === 0) {
          isNewViewOccurrence = true;
          await viewContainer.items.create({
            id: uuidv4(),
            videoId: id,
            userId: user.id,
            viewedAt: new Date().toISOString()
          });
          const item = videoContainer.item(video.id, video.genre);
          await item.replace({ ...video, viewCount: (video.viewCount || 0) + 1 });
        }

        const { resources: watches } = await watchContainer.items.query({
          query: 'SELECT * FROM c WHERE c.userId = @uid AND c.videoId = @vid',
          parameters: [{ name: '@uid', value: user.id }, { name: '@vid', value: id }]
        }).fetchAll();
        const existing = watches[0];

        if (existing) {
          await watchContainer.item(existing.id, user.id).replace({
            ...existing,
            watchDuration: Math.max(existing.watchDuration, watchDuration),
            videoDuration,
            completionPercentage: Math.max(existing.completionPercentage, completionPercentage),
            lastWatchedAt: new Date().toISOString(),
          });
        } else {
          await watchContainer.items.create({
            id: uuidv4(),
            userId: user.id,
            videoId: id,
            creatorId: video.creatorId,
            watchDuration,
            videoDuration,
            completionPercentage,
            lastWatchedAt: new Date().toISOString(),
          });
        }
      } else {
        isNewViewOccurrence = true;
        await viewContainer.items.create({
          id: uuidv4(),
          videoId: id,
          userId: null,
          viewedAt: new Date().toISOString()
        });
        const item = videoContainer.item(video.id, video.genre);
        await item.replace({ ...video, viewCount: (video.viewCount || 0) + 1 });
      }

      return apiSuccess({
        videoId: id,
        watchDuration,
        videoDuration,
        completionPercentage,
        qualifying: completionPercentage >= 0.5,
        newViewCounted: isNewViewOccurrence,
      });

    } else {
      const result = await db.$transaction(
        async (tx) => {
          const video = await tx.video.findUnique({
            where: { id },
            select: { id: true, creatorId: true, duration: true, viewCount: true },
          });

          if (!video) {
            return null;
          }

          const body = await request.json().catch(() => ({}));
          const parsed = watchSchema.safeParse(body);
          const rawWatchDuration = parsed.success ? parsed.data.watchDuration : 0;
          const rawVideoDuration = parsed.success && parsed.data.videoDuration ? parsed.data.videoDuration : (video.duration || 30);

          const videoDuration = Math.max(1, rawVideoDuration);
          const watchDuration = Math.min(videoDuration * 2, Math.max(0, rawWatchDuration));
          const completionPercentage = Math.min(1.0, Math.round((watchDuration / videoDuration) * 100) / 100);

          let isNewViewOccurrence = false;
          const sessionWindowMs = 60 * 1000; // 60-second viewing session window
          const windowStart = new Date(Date.now() - sessionWindowMs);

          if (user) {
            const recentView = await tx.videoView.findFirst({
              where: {
                videoId: id,
                userId: user.id,
                viewedAt: { gte: windowStart },
              },
            });

            if (!recentView) {
              isNewViewOccurrence = true;
              await tx.videoView.create({
                data: {
                  videoId: id,
                  userId: user.id,
                },
              });
              await tx.video.update({
                where: { id },
                data: { viewCount: { increment: 1 } },
              });
            }

            const existing = await tx.videoWatch.findUnique({
              where: {
                userId_videoId: {
                  userId: user.id,
                  videoId: id,
                },
              },
            });

            if (existing) {
              await tx.videoWatch.update({
                where: { id: existing.id },
                data: {
                  watchDuration: Math.max(existing.watchDuration, watchDuration),
                  videoDuration,
                  completionPercentage: Math.max(existing.completionPercentage, completionPercentage),
                  lastWatchedAt: new Date(),
                },
              });
            } else {
              await tx.videoWatch.create({
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
          } else {
            isNewViewOccurrence = true;
            await tx.videoView.create({
              data: {
                videoId: id,
                userId: null,
              },
            });
            await tx.video.update({
              where: { id },
              data: { viewCount: { increment: 1 } },
            });
          }

          return {
            videoId: id,
            watchDuration,
            videoDuration,
            completionPercentage,
            qualifying: completionPercentage >= 0.5,
            newViewCounted: isNewViewOccurrence,
          };
        }, { maxWait: 15000, timeout: 15000 });

      if (!result) {
        return apiError('VIDEO_NOT_FOUND', 'Video not found');
      }

      return apiSuccess(result);
    }
  } catch (error) {
    console.error('Error logging video watch:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
