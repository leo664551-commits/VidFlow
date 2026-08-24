import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiCreated, apiError } from '@/lib/api-response';
import { uploadSessionSchema, videoMetadataSchema, validateFileUpload } from '@/lib/validation';
import { generateUploadUrl } from '@/services/storage';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/services/audit';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  try {
    const body = await request.json();

    const fileInfo = uploadSessionSchema.safeParse(body);
    if (!fileInfo.success) {
      return apiError('VALIDATION_ERROR', fileInfo.error.issues[0].message);
    }

    const metadata = videoMetadataSchema.safeParse(body);
    if (!metadata.success) {
      return apiError('VALIDATION_ERROR', metadata.error.issues[0].message);
    }

    const fileValidation = validateFileUpload(body.fileName, body.fileSize, body.mimeType);
    if (!fileValidation.valid) {
      return apiError('INVALID_FILE_TYPE', fileValidation.error);
    }

    const videoContainer = getContainer('videos');
    const profileContainer = getContainer('creatorProfiles');

    if (videoContainer && profileContainer) {
      let creatorId = user.id;
      if (user.role === 'ADMIN' && body.creatorId) {
        creatorId = body.creatorId;
        const { resources: profiles } = await profileContainer.items
          .query({ query: 'SELECT * FROM c WHERE c.userId = @uid', parameters: [{ name: '@uid', value: creatorId }] })
          .fetchAll();
        if (profiles.length === 0) return apiError('CREATOR_NOT_FOUND');
      } else {
        const { resources: profiles } = await profileContainer.items
          .query({ query: 'SELECT * FROM c WHERE c.userId = @uid', parameters: [{ name: '@uid', value: user.id }] })
          .fetchAll();
        if (profiles.length === 0) {
          await profileContainer.items.create({
            id: uuidv4(),
            userId: user.id,
            creatorName: user.displayName || user.username || 'Creator',
            description: user.bio || '',
            category: user.category || 'Comedy',
          });
        }
      }

      const ext = body.fileName.split('.').pop()?.toLowerCase() || 'mp4';
      const blobName = `videos/${user.id}/${Date.now()}-${body.fileName}`;

      const { uploadUrl } = generateUploadUrl(blobName);

      const videoData = {
        id: uuidv4(),
        creatorId,
        title: metadata.data.title,
        publisher: metadata.data.publisher,
        producer: metadata.data.producer,
        genre: metadata.data.genre,
        ageRating: metadata.data.ageRating,
        description: metadata.data.description ?? null,
        storageBlobName: blobName,
        status: 'UPLOADING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        viewCount: 0,
      };

      await videoContainer.items.create(videoData);

      await createAuditLog(user.id, 'VIDEO_UPLOAD_STARTED', 'Video', videoData.id, { title: metadata.data.title });
      logger.info('Upload session created', { videoId: videoData.id, userId: user.id });

      return apiCreated({
        videoId: videoData.id,
        uploadUrl,
        blobName,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    } else {
      let creatorId = user.id;
      if (user.role === 'ADMIN' && body.creatorId) {
        creatorId = body.creatorId;
        const profile = await db.creatorProfile.findUnique({ where: { userId: creatorId } });
        if (!profile) return apiError('CREATOR_NOT_FOUND');
      } else {
        await db.creatorProfile.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            creatorName: user.displayName || user.username || 'Creator',
            description: user.bio || '',
            category: user.category || 'Comedy',
          },
        });
      }

      const ext = body.fileName.split('.').pop()?.toLowerCase() || 'mp4';
      const blobName = `videos/${user.id}/${Date.now()}-${body.fileName}`;

      const { uploadUrl } = generateUploadUrl(blobName);

      const video = await db.video.create({
        data: {
          creatorId,
          title: metadata.data.title,
          publisher: metadata.data.publisher,
          producer: metadata.data.producer,
          genre: metadata.data.genre,
          ageRating: metadata.data.ageRating,
          description: metadata.data.description ?? null,
          storageBlobName: blobName,
          status: 'UPLOADING',
        },
      });

      await createAuditLog(user.id, 'VIDEO_UPLOAD_STARTED', 'Video', video.id, { title: metadata.data.title });
      logger.info('Upload session created', { videoId: video.id, userId: user.id });

      return apiCreated({
        videoId: video.id,
        uploadUrl,
        blobName,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  } catch (error) {
    logger.error('Upload session failed', { error: (error as Error).message });
    return apiError('INTERNAL_SERVER_ERROR', (error as Error).message);
  }
}
