import type {
  AuthUser,
  PaginatedResponse,
  VideoWithCreator,
  VideoDetail,
  VideoUploadSession,
  Genre,
  AgeRating,
  VideoStatus,
  UserStatus,
  CommentStatus,
} from '@/types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
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
  const res = await fetch('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || 'Login failed')
  }
  return res.json()
}

export async function logout(): Promise<void> {
  await request<void>('/api/auth/logout', { method: 'POST' })
}

export async function updateProfile(data: {
  displayName: string
}): Promise<AuthUser> {
  return request<AuthUser>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// Videos
export interface GetVideosParams {
  page?: number
  limit?: number
  genre?: Genre
  sort?: 'latest' | 'mostViewed' | 'highestRated'
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

export async function getVideoComments(
  videoId: string,
  params?: { page?: number; limit?: number }
): Promise<PaginatedResponse<Comment>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  const qs = searchParams.toString()
  return request<PaginatedResponse<Comment>>(
    `/api/videos/${videoId}/comments${qs ? `?${qs}` : ''}`
  )
}

export async function createComment(
  videoId: string,
  content: string
): Promise<Comment> {
  return request<Comment>(`/api/videos/${videoId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
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

// Ratings
export interface VideoRating {
  averageRating: number
  totalRatings: number
  userRating: number | null
}

export async function getVideoRating(videoId: string): Promise<VideoRating> {
  return request<VideoRating>(`/api/videos/${videoId}/rating`)
}

export async function createRating(
  videoId: string,
  rating: number
): Promise<VideoRating> {
  return request<VideoRating>(`/api/videos/${videoId}/rating`, {
    method: 'POST',
    body: JSON.stringify({ rating }),
  })
}

export async function updateRating(
  videoId: string,
  rating: number
): Promise<VideoRating> {
  return request<VideoRating>(`/api/videos/${videoId}/rating`, {
    method: 'PATCH',
    body: JSON.stringify({ rating }),
  })
}

export async function deleteRating(videoId: string): Promise<VideoRating> {
  return request<VideoRating>(`/api/videos/${videoId}/rating`, {
    method: 'DELETE',
  })
}

// Creator
export interface CreatorDashboard {
  totalVideos: number
  publishedVideos: number
  processingVideos: number
  failedVideos: number
  totalViews: number
  recentVideos: VideoWithCreator[]
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
    displayName: string
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
