import fs from 'fs/promises';
import path from 'path';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { logger } from '@/lib/logger';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'videos');
const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'videos';
const AZURE_CUSTOM_DOMAIN = process.env.AZURE_STORAGE_CUSTOM_DOMAIN;

let containerClientInstance: ContainerClient | null = null;

function getAzureContainerClient(): ContainerClient | null {
  if (!AZURE_CONNECTION_STRING) return null;
  if (!containerClientInstance) {
    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONNECTION_STRING);
      containerClientInstance = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);
    } catch (error) {
      logger.error('Failed to initialize Azure Blob Storage client', { error: (error as Error).message });
      return null;
    }
  }
  return containerClientInstance;
}

// Ensure local upload directory exists when using local filesystem fallback
async function ensureLocalDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function getContentType(blobName: string): string {
  const ext = path.extname(blobName).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

export function generateUploadUrl(blobName: string): { uploadUrl: string; blobName: string } {
  // Return the unified upload-raw endpoint which routes to Azure or Local Storage
  return {
    uploadUrl: `/api/videos/upload-raw?blobName=${encodeURIComponent(blobName)}`,
    blobName,
  };
}

export function getDownloadUrl(blobName: string): string {
  if (!blobName) return '';
  if (blobName.startsWith('http://') || blobName.startsWith('https://')) {
    return blobName;
  }

  const containerClient = getAzureContainerClient();
  if (containerClient) {
    if (AZURE_CUSTOM_DOMAIN) {
      const trimmedDomain = AZURE_CUSTOM_DOMAIN.replace(/\/$/, '');
      return `${trimmedDomain}/${AZURE_CONTAINER_NAME}/${blobName}`;
    }
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    return blockBlobClient.url;
  }

  // Local fallback
  return `/uploads/videos/${blobName}`;
}

export async function deleteBlob(blobName: string): Promise<void> {
  const containerClient = getAzureContainerClient();
  if (containerClient) {
    try {
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.deleteIfExists();
    } catch (error) {
      logger.warn('Failed to delete blob from Azure Storage', { blobName, error: (error as Error).message });
    }
  }

  // Also clean up local file if present
  try {
    const filePath = path.join(UPLOAD_DIR, blobName);
    await fs.access(filePath);
    await fs.unlink(filePath);
  } catch {
    // File may not exist, that's fine
  }
}

export async function exists(blobName: string): Promise<boolean> {
  const containerClient = getAzureContainerClient();
  if (containerClient) {
    try {
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      return await blockBlobClient.exists();
    } catch {
      return false;
    }
  }

  try {
    const filePath = path.join(UPLOAD_DIR, blobName);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function saveFile(blobName: string, buffer: Buffer): Promise<void> {
  const containerClient = getAzureContainerClient();
  if (containerClient) {
    // Ensure the container exists (public access for videos/images)
    await containerClient.createIfNotExists({ access: 'blob' }).catch(() => {});
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const contentType = getContentType(blobName);

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobCacheControl: 'public, max-age=31536000, immutable',
      },
    });
    return;
  }

  // Local filesystem fallback
  await ensureLocalDir();
  const filePath = path.join(UPLOAD_DIR, blobName);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, buffer);
}

export async function getFileSize(blobName: string): Promise<number> {
  const containerClient = getAzureContainerClient();
  if (containerClient) {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const properties = await blockBlobClient.getProperties();
    return properties.contentLength || 0;
  }

  const filePath = path.join(UPLOAD_DIR, blobName);
  const stat = await fs.stat(filePath);
  return stat.size;
}
