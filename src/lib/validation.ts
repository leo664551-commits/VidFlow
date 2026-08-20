import { z } from 'zod';
import { config, GENRES, AGE_RATINGS, USER_ROLES } from '@/config';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(1, 'Display name is required').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const videoMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  publisher: z.string().min(1, 'Publisher is required').max(255),
  producer: z.string().min(1, 'Producer is required').max(255),
  genre: z.enum(GENRES as unknown as [string, ...string[]], {
    error: 'Invalid genre',
  }),
  ageRating: z.enum(AGE_RATINGS as unknown as [string, ...string[]], {
    error: 'Invalid age rating',
  }),
  description: z.string().max(2000).optional().nullable(),
});

export const uploadSessionSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(255),
  fileSize: z.number().positive('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
});

export const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment is too long'),
});

export const ratingSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
});

export const pinCommentSchema = z.object({
  commentId: z.string().nullable().optional(),
});

export const creatorRatingSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
});

export const createCreatorSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(1, 'Display name is required').max(100),
  creatorName: z.string().min(1, 'Creator name is required').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  description: z.string().max(500).optional().nullable(),
});

export const updateCreatorSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  creatorName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const videoSearchSchema = z.object({
  q: z.string().optional(),
  title: z.string().optional(),
  publisher: z.string().optional(),
  producer: z.string().optional(),
  genre: z.enum(GENRES as unknown as [string, ...string[]]).optional(),
  creator: z.string().optional(),
  sort: z.enum(['createdAt', 'viewCount']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).refine(
  (data) => data.q || data.title || data.publisher || data.producer || data.genre || data.creator,
  { message: 'At least one search parameter is required' }
);

export function validateFileUpload(fileName: string, fileSize: number, mimeType: string) {
  const { allowedVideoExtensions, maxVideoSizeBytes } = config.upload;
  const ext = '.' + (fileName.split('.').pop()?.toLowerCase() || '');

  if (!allowedVideoExtensions.includes(ext.replace('.', ''))) {
    return { valid: false, error: 'Invalid file type. Allowed: ' + allowedVideoExtensions.join(', ') };
  }

  if (fileSize > maxVideoSizeBytes) {
    return { valid: false, error: 'File too large. Maximum: ' + (maxVideoSizeBytes / (1024 * 1024)) + 'MB' };
  }

  const allowedMimes = ['video/mp4', 'video/webm'];
  if (!allowedMimes.includes(mimeType)) {
    return { valid: false, error: 'Invalid MIME type.' };
  }

  return { valid: true };
}
