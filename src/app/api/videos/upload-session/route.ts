import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiCreated, apiError } from '@/lib/api-response';
import { uploadSessionSchema, videoMetadataSchema, validateFileUpload } from '@/lib/validation';
import { generateUploadUrl } from '@/services/storage';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/services/audit';

export async function POST(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'CREATOR' && user.role !== 'ADMIN') return apiError('FORBIDDEN');

  try {
    const body = await request.json();

    // Validate file info
    const fileInfo = uploadSessionSchema.safeParse(body);
    if (!fileInfo.success) {
      return apiError('VALIDATION_ERROR', fileInfo.error.issues[0].message);
    }

    // Validate metadata
    const metadata = videoMetadataSchema.safeParse(body);
    if (!metadata.success) {
      return apiError('VALIDATION_ERROR', metadata.error.issues[0].message);
    }

    // Validate file
    const fileValidation = validateFileUpload(body.fileName, body.fileSize, body.mimeType);
    if (!fileValidation.valid) {
      return apiError('INVALID_FILE_TYPE', fileValidation.error);
    }

    // Determine creatorId
    let creatorId = user.id;
    if (user.role === 'ADMIN' && body.creatorId) {
      creatorId = body.creatorId;
      // Verify creator profile exists
      const profile = await db.creatorProfile.findUnique({ where: { userId: creatorId } });
      if (!profile) return apiError('CREATOR_NOT_FOUND');
    } else {
      // Ensure creator profile exists
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

    // Generate blob name
    const ext = body.fileName.split('.').pop()?.toLowerCase() || 'mp4';
    const blobName = `videos/${user.id}/${Date.now()}-${body.fileName}`;

    const { uploadUrl } = generateUploadUrl(blobName);

    // Create video record
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
  } catch (error) {
    logger.error('Upload session failed', { error: (error as Error).message });
    return apiError('INTERNAL_SERVER_ERROR', (error as Error).message);
  }
}
