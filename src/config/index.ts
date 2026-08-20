export const config = {
  auth: {
    provider: (process.env.AUTH_PROVIDER as 'nextauth' | 'entra') || 'nextauth',
  },
  upload: {
    maxVideoSizeBytes: parseInt(process.env.MAX_VIDEO_SIZE_MB || '500') * 1024 * 1024,
    maxVideoDurationSeconds: parseInt(process.env.MAX_VIDEO_DURATION_SECONDS || '600'),
    allowedVideoExtensions: (process.env.ALLOWED_VIDEO_EXTENSIONS || 'mp4,webm').split(','),
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  comment: {
    maxLength: 1000,
  },
  rating: {
    min: 1,
    max: 5,
  },
  viewCounting: {
    // One view per user per video per calendar day
    deduplicateByDay: true,
  },
} as const;

export const GENRES = [
  'ACTION',
  'COMEDY',
  'DRAMA',
  'HORROR',
  'SCIENCE_FICTION',
  'DOCUMENTARY',
  'ANIMATION',
  'THRILLER',
  'ROMANCE',
  'MUSIC',
  'OTHER',
] as const;

export const AGE_RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17'] as const;

export const VIDEO_STATUSES = ['UPLOADING', 'PROCESSING', 'READY', 'FAILED', 'UNPUBLISHED'] as const;

export const USER_ROLES = ['ADMIN', 'CREATOR', 'CONSUMER'] as const;

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};
