export type UserRole = 'ADMIN' | 'CREATOR' | 'CONSUMER';
export type UserStatus = 'ACTIVE' | 'DISABLED';
export type VideoStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED' | 'UNPUBLISHED';
export type CommentStatus = 'VISIBLE' | 'HIDDEN';
export type AgeRating = 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';
export type Genre =
  | 'ACTION'
  | 'COMEDY'
  | 'DRAMA'
  | 'HORROR'
  | 'SCIENCE_FICTION'
  | 'DOCUMENTARY'
  | 'ANIMATION'
  | 'THRILLER'
  | 'ROMANCE'
  | 'MUSIC'
  | 'OTHER';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  creatorProfile?: {
    id: string;
    creatorName: string;
    description: string | null;
  } | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface VideoUploadSession {
  uploadUrl: string;
  blobName: string;
  videoId: string;
  expiresAt: string;
}

export interface VideoWithCreator {
  id: string;
  title: string;
  publisher: string;
  producer: string;
  genre: Genre;
  ageRating: AgeRating;
  description: string | null;
  storageBlobName: string | null;
  thumbnailBlobName: string | null;
  duration: number | null;
  status: VideoStatus;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    creatorName: string;
  };
}

export interface VideoDetail extends VideoWithCreator {
  averageRating: number;
  totalRatings: number;
  userRating: number | null;
  likeCount?: number;
  commentCount?: number;
  userLiked?: boolean;
}

export interface FeedVideo {
  id: string;
  title: string;
  publisher: string;
  producer: string;
  genre: Genre;
  ageRating: AgeRating;
  description: string | null;
  duration: number | null;
  status: VideoStatus;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  avgRating: number;
  userLiked: boolean;
  userRating: number | null;
  creator: {
    id: string;
    creatorName: string;
    displayName: string;
  };
}

export interface CommentWithUser {
  id: string;
  content: string;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    displayName: string;
  };
  replyCount: number;
  videoId: string;
  parentCommentId: string | null;
}

export interface FeedComment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
  };
  replyCount: number;
  likeCount?: number;
}

export interface CreatorPublicProfile {
  id: string;
  creatorName: string;
  displayName: string;
  description: string | null;
  videoCount: number;
  totalViews: number;
  videos: FeedVideo[];
}

export type AppView =
  | 'landing'
  | 'login'
  | 'register'
  | 'feed'
  | 'discover'
  | 'notifications'
  | 'profile'
  | 'creator-profile'
  | 'video-detail'
  | 'creator-dashboard'
  | 'creator-videos'
  | 'creator-upload'
  | 'creator-edit-video'
  | 'admin-dashboard'
  | 'admin-creators'
  | 'admin-creator-new'
  | 'admin-users'
  | 'admin-videos'
  | 'admin-comments';
