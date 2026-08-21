import { signIn, signOut } from 'next-auth/react'
import type {
  AuthUser,
  PaginatedResponse,
  VideoWithCreator,
  VideoDetail,
  VideoUploadSession,
  FeedVideo,
  CommentWithUser,
  CreatorPublicProfile,
  CreatorRating,
  CreatorReviewItem,
  PinCommentResponse,
  Genre,
  AgeRating,
  VideoStatus,
  UserStatus,
  CommentStatus,
} from '@/types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
  const headers: Record<string, string> = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(init?.headers as Record<string, string>),
  }
  const res = await fetch(url, {
    ...init,
    headers,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message || `Request failed: ${res.status}`)
  }
  return res.json()
}

// Auth
export async function getAuthUser(): Promise<AuthUser> {
  return request<AuthUser>('/api/auth/me')
}

export async function getMyProfile(): Promise<AuthUser> {
  return request<AuthUser>('/api/users/me')
}

export async function register(data: {
  email: string
  displayName: string
  password: string
  role: 'CONSUMER' | 'CREATOR'
}): Promise<AuthUser> {
  return request<AuthUser>('/api/users/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function login(email: string, password: string) {
  const res = await signIn('credentials', {
    email,
    password,
    redirect: false,
  })
  if (!res) {
    throw new Error('Login failed. Please check your network and credentials.')
  }
  if (res.error) {
    if (res.error === 'CredentialsSignin') {
      throw new Error('Invalid email or password.')
    }
    throw new Error(res.error)
  }
  return res
}

export async function logout(): Promise<void> {
  await signOut({ redirect: false })
  await request<void>('/api/auth/logout', { method: 'POST' }).catch(() => {})
}

export async function updateProfile(data: {
  displayName?: string
  username?: string
  bio?: string | null
  avatarUrl?: string | null
  gender?: string | null
  website?: string | null
  instagram?: string | null
  youtube?: string | null
  twitter?: string | null
  contactEmail?: string | null
  category?: string | null
}): Promise<AuthUser> {
  return request<AuthUser>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function uploadAvatar(file: File): Promise<{ avatarUrl: string; message: string }> {
  const formData = new FormData()
  formData.append('file', file)
  return request<{ avatarUrl: string; message: string }>('/api/users/me/avatar', {
    method: 'POST',
    body: formData,
  })
}

export async function deleteAvatar(): Promise<{ avatarUrl: null; message: string }> {
  return request<{ avatarUrl: null; message: string }>('/api/users/me/avatar', {
    method: 'DELETE',
  })
}

export async function getMyLikedVideos(): Promise<{ data: FeedVideo[]; total: number }> {
  return request<{ data: FeedVideo[]; total: number }>('/api/users/me/liked-videos')
}

export async function getMyRatings(): Promise<{ data: import('@/types').ConsumerRatingItem[]; total: number }> {
  return request<{ data: import('@/types').ConsumerRatingItem[]; total: number }>('/api/users/me/ratings')
}

export async function applyToBeCreator(data: {
  category: string
  description?: string
  socialLink?: string
}): Promise<{ success: boolean; message: string; status: string; applicationId?: string }> {
  return request<{ success: boolean; message: string; status: string; applicationId?: string }>(
    '/api/creator/apply',
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
}

export async function getCreatorApplicationStatus(): Promise<{
  hasApplication: boolean
  application: {
    id: string
    category: string
    description: string | null
    socialLink: string | null
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    createdAt: string
    reviewedAt: string | null
  } | null
}> {
  return request<{
    hasApplication: boolean
    application: {
      id: string
      category: string
      description: string | null
      socialLink: string | null
      status: 'PENDING' | 'APPROVED' | 'REJECTED'
      createdAt: string
      reviewedAt: string | null
    } | null
  }>('/api/creator/application-status')
}

export async function getAdminCreatorApplications(params?: {
  page?: number
  limit?: number
  status?: string
}): Promise<PaginatedResponse<import('@/types').CreatorApplicationItem>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.status) searchParams.set('status', params.status)
  const qs = searchParams.toString()
  return request<PaginatedResponse<import('@/types').CreatorApplicationItem>>(
    `/api/admin/creator-applications${qs ? `?${qs}` : ''}`
  )
}

export async function reviewCreatorApplication(
  id: string,
  status: 'APPROVED' | 'REJECTED'
): Promise<{ success: boolean; message: string; status: string; applicationId: string }> {
  return request<{ success: boolean; message: string; status: string; applicationId: string }>(
    `/api/admin/creator-applications/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  )
}

// Videos
export interface GetVideosParams {
  page?: number
  limit?: number
  genre?: Genre
  sort?: 'latest' | 'mostViewed'
}

export async function getVideos(
  params?: GetVideosParams
): Promise<PaginatedResponse<VideoWithCreator>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.genre) searchParams.set('genre', params.genre)
  if (params?.sort) searchParams.set('sort', params.sort)
  const qs = searchParams.toString()
  return request<PaginatedResponse<VideoWithCreator>>(
    `/api/videos${qs ? `?${qs}` : ''}`
  )
}

export async function getLatestVideos(
  limit = 8
): Promise<VideoWithCreator[]> {
  return request<VideoWithCreator[]>(
    `/api/videos/latest?limit=${limit}`
  )
}

export interface SearchVideosParams {
  query?: string
  genre?: Genre
  publisher?: string
  producer?: string
  page?: number
  limit?: number
}

export async function searchVideos(
  params: SearchVideosParams
): Promise<PaginatedResponse<VideoWithCreator>> {
  const searchParams = new URLSearchParams()
  if (params.query) searchParams.set('query', params.query)
  if (params.genre) searchParams.set('genre', params.genre)
  if (params.publisher) searchParams.set('publisher', params.publisher)
  if (params.producer) searchParams.set('producer', params.producer)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))
  const qs = searchParams.toString()
  return request<PaginatedResponse<VideoWithCreator>>(
    `/api/videos/search${qs ? `?${qs}` : ''}`
  )
}

export async function getVideoDetail(id: string): Promise<VideoDetail> {
  return request<VideoDetail>(`/api/videos/${id}`)
}

export async function updateVideo(
  id: string,
  data: {
    title?: string
    publisher?: string
    producer?: string
    genre?: Genre
    ageRating?: AgeRating
    description?: string
  }
): Promise<VideoWithCreator> {
  return request<VideoWithCreator>(`/api/videos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteVideo(id: string): Promise<void> {
  await request<void>(`/api/videos/${id}`, { method: 'DELETE' })
}

// Upload
export async function requestUploadSession(data: {
  fileName: string
  fileSize: number
  contentType: string
}): Promise<VideoUploadSession> {
  return request<VideoUploadSession>('/api/videos/upload-session', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function uploadRaw(file: File): Promise<{ videoId: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/videos/upload-raw', {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message || 'Upload failed')
  }
  return res.json()
}

export async function completeUpload(
  id: string,
  data: {
    title: string
    publisher: string
    producer: string
    genre: Genre
    ageRating: AgeRating
    description?: string
  }
): Promise<VideoWithCreator> {
  return request<VideoWithCreator>(`/api/videos/${id}/upload-complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Comments
export interface Comment {
  id: string
  content: string
  status: CommentStatus
  createdAt: string
  updatedAt: string
  user: {
    id: string
    displayName: string
  }
}

// Extended comment with engagement data (returned by GET /api/videos/[id]/comments)
export interface CommentWithEngagement extends CommentWithUser {
  status: CommentStatus
}

interface CommentsApiResponse {
  creatorId?: string | null
  data: CommentWithUser[]
  pinnedCommentId: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function getVideoComments(
  videoId: string,
  params?: { page?: number; limit?: number }
): Promise<{ creatorId?: string | null; data: CommentWithUser[]; pinnedCommentId: string | null; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  const qs = searchParams.toString()
  return request<CommentsApiResponse>(
    `/api/videos/${videoId}/comments${qs ? `?${qs}` : ''}`
  )
}

export async function createComment(
  videoId: string,
  data: { content: string; parentCommentId?: string }
): Promise<Comment> {
  return request<Comment>(`/api/videos/${videoId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateComment(
  commentId: string,
  content: string
): Promise<Comment> {
  return request<Comment>(`/api/comments/${commentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  })
}

export async function deleteComment(commentId: string): Promise<void> {
  await request<void>(`/api/comments/${commentId}`, { method: 'DELETE' })
}

// Comment Like
export async function toggleCommentLike(
  commentId: string
): Promise<{ liked: boolean; likeCount: number }> {
  return request<{ liked: boolean; likeCount: number }>(
    `/api/comments/${commentId}/like`,
    { method: 'POST' }
  )
}

// Pin Comment
export async function pinComment(
  videoId: string,
  commentId: string | null
): Promise<PinCommentResponse> {
  return request<PinCommentResponse>(`/api/videos/${videoId}/pin-comment`, {
    method: 'POST',
    body: JSON.stringify({ commentId }),
  })
}

// Follow Creator
export async function toggleFollowCreator(
  creatorOrUserId: string
): Promise<{ isFollowing: boolean; followerCount: number; followingCount: number }> {
  return request<{ isFollowing: boolean; followerCount: number; followingCount: number }>(
    `/api/creators/${creatorOrUserId}/follow`,
    { method: 'POST' }
  )
}

// Creator Rating
export async function getCreatorRating(
  creatorId: string
): Promise<CreatorRating> {
  return request<CreatorRating>(`/api/creators/${creatorId}/rate`)
}

export async function rateCreator(
  creatorId: string,
  ratingOrData:
    | number
    | {
        overallRating?: number
        rating?: number
        contentQuality?: number
        valueRating?: number
        creativityRating?: number
        entertainmentRating?: number
        consistencyRating?: number
        review?: string
        tags?: string[]
      }
): Promise<CreatorReviewItem> {
  const body =
    typeof ratingOrData === 'number'
      ? { rating: ratingOrData }
      : ratingOrData
  return request<CreatorReviewItem>(`/api/creators/${creatorId}/rate`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateCreatorRating(
  creatorId: string,
  ratingOrData:
    | number
    | {
        overallRating?: number
        rating?: number
        contentQuality?: number
        valueRating?: number
        creativityRating?: number
        entertainmentRating?: number
        consistencyRating?: number
        review?: string
        tags?: string[]
      }
): Promise<CreatorReviewItem> {
  const body =
    typeof ratingOrData === 'number'
      ? { rating: ratingOrData }
      : ratingOrData
  return request<CreatorReviewItem>(`/api/creators/${creatorId}/rate`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteCreatorRating(creatorId: string): Promise<void> {
  await request<void>(`/api/creators/${creatorId}/rate`, { method: 'DELETE' })
}

export interface CreatorDashboardComment {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    displayName: string
  }
  video: {
    id: string
    title: string
    genre: string
  }
}

export interface CreatorDashboardReview {
  id: string
  overallRating?: number
  rating: number
  review: string | null
  tags: string[]
  createdAt: string
  user: {
    id: string
    displayName: string
    username?: string | null
    avatarUrl?: string | null
  }
}

export interface CreatorDashboardRatings {
  totalRatings: number
  averageRating: number
  ratingBreakdown: { 5: number; 4: number; 3: number; 2: number; 1: number }
  reviews: CreatorDashboardReview[]
}

export interface CreatorDashboard {
  totalVideos: number
  publishedVideos: number
  processingVideos: number
  failedVideos: number
  totalViews: number
  totalLikes?: number
  totalComments?: number
  followerCount?: number
  followingCount?: number
  profileViews?: number
  uniqueViewers?: number
  sharesCount?: number
  creatorProfile?: {
    id: string
    creatorName: string
    displayName?: string
    description: string | null
    bio?: string | null
  }
  recentVideos: (VideoWithCreator & { likeCount?: number; commentCount?: number })[]
  recentComments?: CreatorDashboardComment[]
  ratings?: CreatorDashboardRatings
}

export async function getCreatorDashboard(): Promise<CreatorDashboard> {
  return request<CreatorDashboard>('/api/creator/dashboard')
}

export async function getCreatorVideos(
  params?: { page?: number; limit?: number; status?: VideoStatus }
): Promise<PaginatedResponse<VideoWithCreator>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.status) searchParams.set('status', params.status)
  const qs = searchParams.toString()
  return request<PaginatedResponse<VideoWithCreator>>(
    `/api/creator/videos${qs ? `?${qs}` : ''}`
  )
}

export interface CreatorSearchResult {
  id: string
  userId: string
  creatorName: string
  username: string
  displayName: string
  bio: string
  avatarUrl: string | null
  gender: string
  website: string | null
  instagram: string | null
  youtube: string | null
  twitter: string | null
  contactEmail: string | null
  videoCount: number
  followerCount: number
}

export async function searchCreators(query?: string): Promise<CreatorSearchResult[]> {
  const searchParams = new URLSearchParams()
  if (query) searchParams.set('q', query)
  const qs = searchParams.toString()
  return request<CreatorSearchResult[]>(`/api/creators${qs ? `?${qs}` : ''}`)
}

// Admin
export interface AdminDashboard {
  totalConsumers: number
  totalCreators: number
  totalVideos: number
  publishedVideos: number
  processingVideos: number
  failedVideos: number
  recentUploads: VideoWithCreator[]
  recentUsers: AuthUser[]
  recentComments: Comment[]
  mostViewedVideos: VideoWithCreator[]
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  return request<AdminDashboard>('/api/admin/dashboard')
}

export interface AdminCreator {
  id: string
  userId: string
  creatorName: string
  description: string | null
  videoCount: number
  user: {
    id: string
    email: string
    username?: string | null
    displayName: string
    avatarUrl?: string | null
    status: UserStatus
  }
}

export async function getAdminCreators(
  params?: { page?: number; limit?: number; search?: string }
): Promise<PaginatedResponse<AdminCreator>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.search) searchParams.set('search', params.search)
  const qs = searchParams.toString()
  return request<PaginatedResponse<AdminCreator>>(
    `/api/admin/creators${qs ? `?${qs}` : ''}`
  )
}

export async function createCreator(data: {
  email: string
  displayName: string
  creatorName: string
  password: string
  description?: string
}): Promise<AdminCreator> {
  return request<AdminCreator>('/api/admin/creators', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getAdminCreator(id: string): Promise<AdminCreator> {
  return request<AdminCreator>(`/api/admin/creators/${id}`)
}

export async function updateCreator(
  id: string,
  data: {
  creatorName?: string
  description?: string
  }
): Promise<AdminCreator> {
  return request<AdminCreator>(`/api/admin/creators/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteCreator(id: string): Promise<void> {
  await request<void>(`/api/admin/creators/${id}`, { method: 'DELETE' })
}

export async function getAdminUsers(
  params?: {
    page?: number
    limit?: number
    search?: string
    role?: string
    status?: string
  }
): Promise<PaginatedResponse<AuthUser>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.search) searchParams.set('search', params.search)
  if (params?.role) searchParams.set('role', params.role)
  if (params?.status) searchParams.set('status', params.status)
  const qs = searchParams.toString()
  return request<PaginatedResponse<AuthUser>>(
    `/api/admin/users${qs ? `?${qs}` : ''}`
  )
}

export async function updateUserStatus(
  id: string,
  status: UserStatus
): Promise<AuthUser> {
  return request<AuthUser>(`/api/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function getAdminVideos(
  params?: {
    page?: number
    limit?: number
    search?: string
    status?: VideoStatus
    genre?: Genre
  }
): Promise<PaginatedResponse<VideoWithCreator>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.search) searchParams.set('search', params.search)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.genre) searchParams.set('genre', params.genre)
  const qs = searchParams.toString()
  return request<PaginatedResponse<VideoWithCreator>>(
    `/api/admin/videos${qs ? `?${qs}` : ''}`
  )
}

export async function updateVideoStatus(
  id: string,
  status: VideoStatus
): Promise<VideoWithCreator> {
  return request<VideoWithCreator>(`/api/admin/videos/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function adminDeleteVideo(id: string): Promise<void> {
  await request<void>(`/api/admin/videos/${id}`, { method: 'DELETE' })
}

export async function getAdminComments(
  params?: {
    page?: number
    limit?: number
    status?: CommentStatus
  }
): Promise<PaginatedResponse<Comment>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.status) searchParams.set('status', params.status)
  const qs = searchParams.toString()
  return request<PaginatedResponse<Comment>>(
    `/api/admin/comments${qs ? `?${qs}` : ''}`
  )
}

export async function updateCommentStatus(
  id: string,
  status: CommentStatus
): Promise<Comment> {
  return request<Comment>(`/api/admin/comments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function adminDeleteComment(id: string): Promise<void> {
  await request<void>(`/api/admin/comments/${id}`, { method: 'DELETE' })
}

// Feed
export async function getFeedVideos(params?: {
  page?: number
  limit?: number
  genre?: string
  seed?: string
}): Promise<PaginatedResponse<FeedVideo>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.genre) searchParams.set('genre', params.genre)
  if (params?.seed) searchParams.set('seed', params.seed)
  const qs = searchParams.toString()
  return request<PaginatedResponse<FeedVideo>>(
    `/api/videos/feed${qs ? `?${qs}` : ''}`
  )
}

// Like
export async function toggleLike(
  videoId: string
): Promise<{ liked: boolean; likeCount: number }> {
  return request<{ liked: boolean; likeCount: number }>(
    `/api/videos/${videoId}/like`,
    { method: 'POST' }
  )
}

export async function getLikeStatus(
  videoId: string
): Promise<{ liked: boolean; likeCount: number }> {
  return request<{ liked: boolean; likeCount: number }>(
    `/api/videos/${videoId}/like`
  )
}

// Comment Replies
export async function getCommentReplies(
  commentId: string,
  params?: { page?: number; limit?: number }
): Promise<PaginatedResponse<CommentWithUser>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  const qs = searchParams.toString()
  return request<PaginatedResponse<CommentWithUser>>(
    `/api/comments/${commentId}/replies${qs ? `?${qs}` : ''}`
  )
}

// Public Creator
interface CreatorProfileApiResponse {
  creator: {
    id: string
    userId: string
    creatorName: string
    username?: string | null
    displayName: string
    description: string | null
    bio: string | null
    category?: string | null
    categoryChangeCount?: number
    avatarUrl?: string | null
    gender?: string | null
    website?: string | null
    instagram?: string | null
    youtube?: string | null
    twitter?: string | null
    contactEmail?: string | null
  }
  stats: {
    postCount: number
    videoCount: number
    followerCount: number
    followingCount: number
    isFollowing: boolean
    totalViews: number
    averageRating: number
    totalRatings: number
    bayesianScore?: number
    confidenceLevel?: 'LIMITED_DATA' | 'MODERATE' | 'ESTABLISHED'
    isLimitedData?: boolean
    dimensionAverages?: {
      contentQuality: number
      valueRating: number
      creativityRating: number
      entertainmentRating: number
      consistencyRating: number
    }
    userRating: number | null
    userReview?: string | null
    ratingBreakdown: { 5: number; 4: number; 3: number; 2: number; 1: number }
  }
  ratingEligibility?: import('@/types').RatingEligibility
  reviews: CreatorReviewItem[]
  videos: PaginatedResponse<FeedVideo>
}

export async function getCreatorProfile(
  creatorId: string
): Promise<CreatorPublicProfile> {
  const res = await request<CreatorProfileApiResponse>(
    `/api/creators/${creatorId}`
  )
  return {
    id: res.creator.id,
    userId: res.creator.userId,
    creatorName: res.creator.creatorName,
    username: res.creator.username || res.creator.creatorName,
    displayName: res.creator.displayName,
    description: res.creator.description,
    bio: res.creator.bio || res.creator.description || '',
    category: res.creator.category || 'Comedy',
    categoryChangeCount: res.creator.categoryChangeCount || 0,
    avatarUrl: res.creator.avatarUrl || null,
    gender: res.creator.gender || 'PREFER_NOT_TO_SAY',
    website: res.creator.website || null,
    instagram: res.creator.instagram || null,
    youtube: res.creator.youtube || null,
    twitter: res.creator.twitter || null,
    contactEmail: res.creator.contactEmail || null,
    postCount: res.stats.postCount ?? res.stats.videoCount ?? 0,
    videoCount: res.stats.videoCount ?? 0,
    followerCount: res.stats.followerCount ?? 0,
    followingCount: res.stats.followingCount ?? 0,
    isFollowing: res.stats.isFollowing ?? false,
    totalViews: res.stats.totalViews ?? 0,
    averageRating: res.stats.averageRating ?? 0,
    totalRatings: res.stats.totalRatings ?? 0,
    bayesianScore: res.stats.bayesianScore,
    confidenceLevel: res.stats.confidenceLevel,
    isLimitedData: res.stats.isLimitedData,
    dimensionAverages: res.stats.dimensionAverages,
    userRating: res.stats.userRating ?? null,
    userReview: res.stats.userReview ?? null,
    ratingBreakdown: res.stats.ratingBreakdown ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    ratingEligibility: res.ratingEligibility,
    reviews: res.reviews ?? [],
    videos: res.videos.data ?? [],
  }
}

export async function getCreatorFollowers(
  creatorOrUserId: string
): Promise<{ total: number; data: import('@/types').FollowUserItem[] }> {
  return request<{ total: number; data: import('@/types').FollowUserItem[] }>(
    `/api/creators/${creatorOrUserId}/followers`
  )
}

export async function getCreatorFollowing(
  creatorOrUserId: string
): Promise<{ total: number; data: import('@/types').FollowUserItem[] }> {
  return request<{ total: number; data: import('@/types').FollowUserItem[] }>(
    `/api/creators/${creatorOrUserId}/following`
  )
}

// Watch Tracking
export async function recordVideoWatch(
  videoId: string,
  data: { watchDuration: number; videoDuration?: number }
): Promise<{ videoId: string; watchDuration: number; completionPercentage: number; qualifying: boolean }> {
  return request<{ videoId: string; watchDuration: number; completionPercentage: number; qualifying: boolean }>(
    `/api/videos/${videoId}/watch`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  ).catch(() => ({ videoId, watchDuration: 0, completionPercentage: 0, qualifying: false }))
}

// Notifications
export async function getNotifications(params?: {
  page?: number
  limit?: number
}): Promise<import('@/types').NotificationListResponse> {
  const sp = new URLSearchParams()
  if (params?.page) sp.set('page', String(params.page))
  if (params?.limit) sp.set('limit', String(params.limit))
  const qs = sp.toString()
  return request<import('@/types').NotificationListResponse>(`/api/notifications${qs ? `?${qs}` : ''}`)
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/api/notifications', {
    method: 'PATCH',
  })
}

export async function markNotificationAsRead(
  id: string
): Promise<{ id: string; read: boolean; readAt: string | null }> {
  return request<{ id: string; read: boolean; readAt: string | null }>(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  })
}
