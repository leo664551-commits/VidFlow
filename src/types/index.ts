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
  username?: string | null;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  bio?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
  website?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  twitter?: string | null;
  contactEmail?: string | null;
  category?: string | null;
  categoryChangeCount?: number;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  createdAt?: string;
  creatorProfile?: {
    id: string;
    creatorName: string;
    description: string | null;
  } | null;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  content: string;
  status: CommentStatus;
  createdAt: string;
  parentCommentId?: string | null;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  video?: {
    id: string;
    title: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    seed?: string;
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
  likeCount?: number;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    creatorName: string;
  };
}

export interface VideoDetail extends Omit<VideoWithCreator, 'creator'> {
  pinnedCommentId: string | null;
  likeCount?: number;
  commentCount?: number;
  userLiked?: boolean;
  creator: {
    id: string;
    creatorName: string;
    displayName: string;
    username?: string | null;
    avatarUrl?: string | null;
    isFollowing?: boolean;
    isSelf?: boolean;
  };
}

export interface FeedVideo {
  id: string;
  title: string;
  publisher: string;
  producer: string;
  genre: Genre;
  ageRating: AgeRating;
  description: string | null;
  storageBlobName?: string | null;
  thumbnailBlobName?: string | null;
  duration: number | null;
  status: VideoStatus;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  pinnedCommentId: string | null;
  userLiked: boolean;
  creator: {
    id: string;
    creatorName: string;
    displayName: string;
    username?: string | null;
    avatarUrl?: string | null;
    isFollowing?: boolean;
    isSelf?: boolean;
  };
}

export interface FollowUserItem {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  bio: string | null;
  creatorProfileId?: string | null;
  creatorName?: string | null;
  isFollowing: boolean;
  isSelf: boolean;
  followedAt?: string;
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
    username?: string | null;
    avatarUrl?: string | null;
  };
  replyCount: number;
  likeCount: number;
  userLiked: boolean;
  isPinned?: boolean;
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

export interface RatingBreakdown {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface RatingEligibility {
  eligible: boolean;
  canRate: boolean;
  isSelf: boolean;
  status: 'NOT_LOGGED_IN' | 'SELF' | 'NOT_ELIGIBLE' | 'ALMOST_ELIGIBLE' | 'ELIGIBLE' | 'ALREADY_RATED';
  qualifyingVideos: number;
  requiredVideos: number;
  averageCompletion: number;
  totalCreatorVideos: number;
  reason: string;
  userRating?: {
    id: string;
    overallRating: number;
    rating: number;
    contentQuality: number | null;
    valueRating: number | null;
    creativityRating: number | null;
    entertainmentRating: number | null;
    consistencyRating: number | null;
    review: string | null;
    tags: string[];
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface CreatorReviewItem {
  id: string;
  overallRating: number;
  rating: number;
  contentQuality?: number | null;
  valueRating?: number | null;
  creativityRating?: number | null;
  entertainmentRating?: number | null;
  consistencyRating?: number | null;
  review: string | null;
  tags: string[] | null;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    username?: string | null;
    avatarUrl?: string | null;
  };
}

export interface ConsumerRatingItem {
  id: string;
  creatorId: string;
  overallRating: number;
  rating: number;
  contentQuality: number;
  valueRating: number;
  creativityRating: number;
  entertainmentRating: number;
  consistencyRating: number;
  review: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    userId: string;
    creatorName: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
}

export interface CreatorApplicationItem {
  id: string;
  userId: string;
  category: string;
  description: string | null;
  socialLink: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    username?: string | null;
    displayName: string;
    avatarUrl: string | null;
    status: UserStatus;
    createdAt: string;
  };
}

export interface CreatorPublicProfile {
  id: string;
  userId: string;
  creatorName: string;
  username?: string | null;
  displayName: string;
  description: string | null;
  bio: string | null;
  category?: string | null;
  categoryChangeCount?: number;
  avatarUrl?: string | null;
  gender?: string | null;
  website?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  twitter?: string | null;
  contactEmail?: string | null;
  postCount: number;
  videoCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  totalViews: number;
  averageRating: number;
  totalRatings: number;
  bayesianScore?: number;
  confidenceLevel?: 'LIMITED_DATA' | 'MODERATE' | 'ESTABLISHED';
  isLimitedData?: boolean;
  dimensionAverages?: {
    contentQuality: number;
    valueRating: number;
    creativityRating: number;
    entertainmentRating: number;
    consistencyRating: number;
  };
  userRating: number | null;
  userReview?: string | null;
  ratingBreakdown: RatingBreakdown;
  ratingEligibility?: RatingEligibility;
  reviews: CreatorReviewItem[];
  videos: FeedVideo[];
}

export interface CreatorRating {
  averageRating: number;
  totalRatings: number;
  bayesianScore?: number;
  confidenceLevel?: 'LIMITED_DATA' | 'MODERATE' | 'ESTABLISHED';
  isLimitedData?: boolean;
  dimensionAverages?: {
    contentQuality: number;
    valueRating: number;
    creativityRating: number;
    entertainmentRating: number;
    consistencyRating: number;
  };
  userRating: number | null;
  userReview?: string | null;
  ratingBreakdown?: RatingBreakdown;
  reviews?: CreatorReviewItem[];
  eligibility?: RatingEligibility;
}

export interface PinCommentResponse {
  pinnedCommentId: string | null;
}

export interface NotificationItem {
  id: string;
  type: 'LIKE_VIDEO' | 'LIKE_COMMENT' | 'COMMENT_REPLY' | 'VIDEO_COMMENT' | 'FOLLOW' | 'CREATOR_RATING' | 'SYSTEM' | string;
  title: string | null;
  message: string;
  entityType: string | null;
  entityId: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  actor: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unreadCount: number;
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
  | 'admin-applications'
  | 'admin-creators'
  | 'admin-creator-new'
  | 'admin-users'
  | 'admin-videos'
  | 'admin-comments'
  | 'admin-moderation'
  | 'admin-audit-logs'
  | 'admin-analytics'
  | 'admin-system';

export interface AdminAuditLogItem {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: string | null;
  createdAt: string;
  actor: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    avatarUrl?: string | null;
  };
}

export interface AdminReportItem {
  id: string;
  type: 'VIDEO' | 'USER' | 'COMMENT';
  targetId: string;
  targetTitle?: string;
  targetAuthor?: string;
  reporterName: string;
  reason: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
}