import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { saveFile } from '@/services/storage';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CREATOR' && user.role !== 'ADMIN') {
    return apiError('FORBIDDEN', 'Only approved creators can upload videos');
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('VALIDATION_ERROR', 'No file provided');
    }

    // Validate file type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['mp4', 'webm', 'jpg', 'jpeg', 'png', 'webp'];
    if (!ext || !allowedExts.includes(ext.replace('.', ''))) {
      return apiError('INVALID_FILE_TYPE');
    }

    // Validate MIME type
    const allowedMimes = ['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.type)) {
      return apiError('INVALID_FILE_TYPE');
    }

    // Validate file size (500MB max for video, 10MB for images)
    const isImage = file.type.startsWith('image/');
    const maxSize = isImage ? 10 * 1024 * 1024 : 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return apiError('FILE_TOO_LARGE');
    }

    let blobName = new URL(request.url).searchParams.get('blobName');
    let videoId: string | undefined;

    if (!blobName) {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      if (isImage) {
        blobName = `thumbnails/${user.id}/${Date.now()}-${sanitizedName}`;
      } else {
        blobName = `videos/${user.id}/${Date.now()}-${sanitizedName}`;

        // Ensure CreatorProfile exists in Cosmos DB
        const cpContainer = (await import('@/lib/cosmos')).getContainer('creatorProfiles');
        if (cpContainer) {
          const { resources: existing } = await cpContainer.items
            .query({ query: 'SELECT * FROM c WHERE c.userId = @uid', parameters: [{ name: '@uid', value: user.id }] })
            .fetchAll();
          if (existing.length === 0) {
            const { v4: uuidv4 } = await import('uuid');
            await cpContainer.items.create({
              id: uuidv4(),
              userId: user.id,
              creatorName: user.displayName || user.username || 'Creator',
              description: user.bio || '',
              category: user.category || 'Comedy',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
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

        // Auto-create video record in UPLOADING status
        const { createVideo } = await import('@/lib/repositories/video-repository');
        const video = await createVideo({
          creatorId: user.id,
          title: file.name.replace(/\.[^.]+$/, ''),
          publisher: user.displayName || 'Creator',
          producer: user.displayName || 'Creator',
          genre: 'OTHER',
          ageRating: 'PG',
          storageBlobName: blobName,
          thumbnailBlobName: null,
          duration: null,
          description: null,
          status: 'UPLOADING',
          pinnedCommentId: null,
        });
        videoId = video.id;
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await saveFile(blobName, buffer);

    logger.info('File uploaded', { blobName, videoId, userId: user.id, size: file.size });

    return apiSuccess({ blobName, videoId });
  } catch (error) {
    logger.error('Upload failed', { error: (error as Error).message });
    return apiError('INTERNAL_SERVER_ERROR', (error as Error).message);
  }
}
