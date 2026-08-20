import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'videos');

// Ensure upload directory exists
async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export function generateUploadUrl(blobName: string): { uploadUrl: string; blobName: string } {
  // For local dev, return the upload-raw proxy endpoint
  return {
    uploadUrl: `/api/videos/upload-raw?blobName=${encodeURIComponent(blobName)}`,
    blobName,
  };
}

export function getDownloadUrl(blobName: string): string {
  // For local dev, files are served statically from public/
  return `/uploads/videos/${blobName}`;
}

export async function deleteBlob(blobName: string): Promise<void> {
  try {
    const filePath = path.join(UPLOAD_DIR, blobName);
    await fs.access(filePath);
    await fs.unlink(filePath);
  } catch {
    // File may not exist, that's fine
  }
}

export async function exists(blobName: string): Promise<boolean> {
  try {
    const filePath = path.join(UPLOAD_DIR, blobName);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function saveFile(blobName: string, buffer: Buffer): Promise<void> {
  await ensureDir();
  const filePath = path.join(UPLOAD_DIR, blobName);
  // Ensure subdirectory exists
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, buffer);
}

export async function getFileSize(blobName: string): Promise<number> {
  const filePath = path.join(UPLOAD_DIR, blobName);
  const stat = await fs.stat(filePath);
  return stat.size;
}
