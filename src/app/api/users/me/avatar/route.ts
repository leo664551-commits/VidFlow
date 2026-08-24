import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import path from 'path';

export async function POST(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED', 'Please log in to upload an avatar');

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('VALIDATION_ERROR', 'No image file provided');
    }

    // Validate MIME type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.type)) {
      return apiError('INVALID_FILE_TYPE', 'Only JPG, PNG, WebP, and GIF images are allowed');
    }

    // Validate size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return apiError('FILE_TOO_LARGE', 'Image size must be less than 5MB');
    }

    // Generate safe filename
    const ext = path.extname(file.name).toLowerCase() || (file.type === 'image/png' ? '.png' : '.jpg');
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    const filename = `${user.id}-${Date.now()}${safeExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let avatarUrl = `/uploads/avatars/${filename}`;

    const azureConn = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const avatarContainer = process.env.AZURE_STORAGE_AVATAR_CONTAINER || 'avatars';

    if (azureConn) {
      try {
        const { BlobServiceClient } = await import('@azure/storage-blob');
        const blobServiceClient = BlobServiceClient.fromConnectionString(azureConn);
        const containerClient = blobServiceClient.getContainerClient(avatarContainer);
        await containerClient.createIfNotExists({ access: 'blob' }).catch(() => {});
        const blockBlobClient = containerClient.getBlockBlobClient(filename);
        await blockBlobClient.uploadData(buffer, {
          blobHTTPHeaders: {
            blobContentType: file.type || 'image/jpeg',
            blobCacheControl: 'public, max-age=31536000, immutable',
          },
        });
        const customDomain = process.env.AZURE_STORAGE_CUSTOM_DOMAIN;
        avatarUrl = customDomain
          ? `${customDomain.replace(/\/$/, '')}/${avatarContainer}/${filename}`
          : blockBlobClient.url;
      } catch (azureErr) {
        console.error('Failed to upload avatar to Azure Storage container avatars, attempting fallback container videos:', azureErr);
        // Fallback to the main videos storage container
        try {
          const { BlobServiceClient } = await import('@azure/storage-blob');
          const blobServiceClient = BlobServiceClient.fromConnectionString(azureConn);
          const fallbackContainer = process.env.AZURE_STORAGE_CONTAINER_NAME || 'videos';
          const containerClient = blobServiceClient.getContainerClient(fallbackContainer);
          await containerClient.createIfNotExists({ access: 'blob' }).catch(() => {});
          const blobPath = `avatars/${filename}`;
          const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
          await blockBlobClient.uploadData(buffer, {
            blobHTTPHeaders: {
              blobContentType: file.type || 'image/jpeg',
              blobCacheControl: 'public, max-age=31536000, immutable',
            },
          });
          avatarUrl = blockBlobClient.url;
        } catch (fallbackErr) {
          console.error('Both Azure Storage containers failed for avatar:', fallbackErr);
          throw new Error('Could not upload avatar image to cloud storage.');
        }
      }
    } else {
      // Local development disk storage fallback only when Azure is not configured
      try {
        const fs = await import('fs/promises');
        const localDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
        await fs.mkdir(localDir, { recursive: true });
        const filePath = path.join(localDir, filename);
        await fs.writeFile(filePath, buffer);
      } catch (localErr) {
        console.warn('Local disk write skipped or failed:', localErr);
      }
    }

    // Update user in database / Cosmos DB
    const { updateUser } = await import('@/lib/repositories/user-repository');
    await updateUser(user.id, { avatarUrl });

    // Also update creator profile if present in Cosmos DB
    try {
      const { getContainer } = await import('@/lib/cosmos');
      const cpContainer = getContainer('creatorProfiles');
      if (cpContainer) {
        const { resources } = await cpContainer.items
          .query({ query: 'SELECT * FROM c WHERE c.userId = @uid', parameters: [{ name: '@uid', value: user.id }] })
          .fetchAll();
        if (resources[0]) {
          await cpContainer.item(resources[0].id, user.id).replace({
            ...resources[0],
            avatarUrl,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (cpErr) {
      console.warn('Could not update avatar in creatorProfiles container:', cpErr);
    }

    return apiSuccess({
      avatarUrl,
      message: 'Avatar uploaded successfully',
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return apiError('INTERNAL_SERVER_ERROR', (error as Error).message || 'Failed to upload avatar');
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  try {
    const { updateUser } = await import('@/lib/repositories/user-repository');
    await updateUser(user.id, { avatarUrl: null });

    return apiSuccess({
      avatarUrl: null,
      message: 'Avatar removed',
    });
  } catch (error) {
    console.error('Avatar delete error:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
