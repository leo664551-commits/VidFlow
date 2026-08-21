'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import {
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  getMyProfile,
  getMyLikedVideos,
  getMyRatings,
  getAdminDashboard,
  getAdminCreatorApplications,
  reviewCreatorApplication,
} from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  ArrowLeft,
  Share2,
  Pencil,
  Shield,
  Play,
  Eye,
  Plus,
  Camera,
  Trash2,
  AtSign,
  Copy,
  Check,
  Heart,
  Star,
  Users,
  Film,
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UserAvatar } from '@/components/common/user-avatar'
import { CreatorApplicationItem, FeedVideo, ConsumerRatingItem } from '@/types'

const GENRE_GRADIENTS: Record<string, string> = {
  ACTION: 'from-red-600 via-rose-800 to-black',
  COMEDY: 'from-amber-500 via-yellow-700 to-black',
  DRAMA: 'from-purple-600 via-indigo-900 to-black',
  HORROR: 'from-zinc-700 via-gray-900 to-black',
  SCIENCE_FICTION: 'from-cyan-600 via-blue-900 to-black',
  DOCUMENTARY: 'from-emerald-600 via-teal-900 to-black',
  ANIMATION: 'from-pink-500 via-rose-900 to-black',
  THRILLER: 'from-orange-600 via-amber-900 to-black',
  ROMANCE: 'from-rose-500 via-pink-900 to-black',
  MUSIC: 'from-violet-600 via-purple-900 to-black',
  OTHER: 'from-gray-600 via-zinc-900 to-black',
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function AdminProfileView() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const navigate = useAppStore((s) => s.navigate)
  const goBack = useAppStore((s) => s.goBack)
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'applications' | 'liked' | 'ratings'>('applications')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [copiedUsername, setCopiedUsername] = useState(false)

  // Edit personal profile form states
  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || '')
  const [editUsername, setEditUsername] = useState(user?.username || '')
  const [editBio, setEditBio] = useState(user?.bio || '')
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(user?.avatarUrl || null)
  const [editGender, setEditGender] = useState(user?.gender || 'PREFER_NOT_TO_SAY')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Authoritative fresh profile query
  const { data: userProfile } = useQuery({
    queryKey: ['user-me'],
    queryFn: getMyProfile,
    enabled: !!user,
  })

  // Admin Dashboard stats
  const { data: adminStats } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getAdminDashboard,
    enabled: !!user,
  })

  // Pending creator applications
  const { data: applicationsData, isLoading: appsLoading } = useQuery({
    queryKey: ['admin-creator-applications', 'PENDING'],
    queryFn: () => getAdminCreatorApplications({ status: 'PENDING', limit: 20 }),
    enabled: !!user,
  })

  // Fetch personal liked videos
  const { data: likedVideosData, isLoading: likedLoading } = useQuery({
    queryKey: ['my-liked-videos'],
    queryFn: getMyLikedVideos,
    enabled: !!user,
  })

  // Fetch personal submitted ratings
  const { data: myRatingsData, isLoading: ratingsLoading } = useQuery({
    queryKey: ['my-ratings'],
    queryFn: getMyRatings,
    enabled: !!user,
  })

  const activeUser = userProfile || user
  const displayUsername =
    activeUser?.username ||
    activeUser?.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') ||
    `admin_${activeUser?.id.slice(-4)}`

  const applicationsList = applicationsData?.data || []
  const likedVideosList = likedVideosData?.data || []
  const myRatingsList = myRatingsData?.data || []

  // Open edit modal and populate state
  const handleOpenEditModal = () => {
    setEditDisplayName(activeUser?.displayName || '')
    setEditUsername(displayUsername)
    setEditBio(activeUser?.bio || '')
    setEditAvatarUrl(activeUser?.avatarUrl || null)
    setEditGender(activeUser?.gender || 'PREFER_NOT_TO_SAY')
    setEditModalOpen(true)
  }

  // Handle avatar file selection
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setUploadingAvatar(true)
    try {
      const res = await uploadAvatar(file)
      setEditAvatarUrl(res.avatarUrl)
      toast.success('Avatar uploaded!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Avatar upload failed')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      await deleteAvatar()
      setEditAvatarUrl(null)
      toast.success('Avatar removed')
    } catch {
      setEditAvatarUrl(null)
    }
  }

  // Save personal profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editDisplayName.trim()) {
      toast.error('Display name cannot be empty')
      return
    }

    const cleanUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '')
    if (cleanUsername.length < 3) {
      toast.error('Username must be at least 3 characters long')
      return
    }

    setSaving(true)
    try {
      const updated = await updateProfile({
        displayName: editDisplayName.trim(),
        username: cleanUsername,
        bio: editBio.trim(),
        avatarUrl: editAvatarUrl || undefined,
        gender: editGender,
      })

      setUser({
        ...user!,
        displayName: updated.displayName,
        username: updated.username,
        bio: updated.bio,
        avatarUrl: updated.avatarUrl,
        gender: updated.gender,
      })

      queryClient.invalidateQueries({ queryKey: ['user-me'] })
      setEditModalOpen(false)
      toast.success('Admin profile updated!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  // Handle reviewing creator application (Approve / Reject)
  const handleReviewApplication = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setReviewingId(id)
    try {
      const res = await reviewCreatorApplication(id, status)
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['admin-creator-applications'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Review failed')
    } finally {
      setReviewingId(null)
    }
  }

  const handleCopyUsername = () => {
    const handle = `@${displayUsername}`
    navigator.clipboard.writeText(handle)
    setCopiedUsername(true)
    toast.success(`Copied ${handle} to clipboard!`)
    setTimeout(() => setCopiedUsername(false), 2000)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/platform/@${displayUsername}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${activeUser?.displayName || 'Administrator'} on VidFlow`,
          text: `Check out @${displayUsername} on VidFlow!`,
          url,
        })
        return
      } catch {}
    }
    navigator.clipboard.writeText(url)
    toast.success('Profile link copied to clipboard!')
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-black pb-24 scrollbar-thin scrollbar-thumb-zinc-800">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <button
          onClick={() => goBack('feed')}
          className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-bold text-white text-sm truncate max-w-[200px]">
            {activeUser?.displayName || 'Administrator Profile'}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">@{displayUsername}</span>
        </div>
        <button
          onClick={handleShare}
          className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
          aria-label="Share"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Header Profile Content */}
      <div className="px-4 pt-6 pb-2 max-w-2xl mx-auto">
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Avatar with gradient border */}
          <div className="relative group shrink-0">
            <UserAvatar
              src={activeUser?.avatarUrl}
              name={activeUser?.displayName}
              size="2xl"
              bordered
            />
            <button
              onClick={handleOpenEditModal}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#FE2C55] text-white flex items-center justify-center border-2 border-black shadow-lg hover:scale-110 transition-transform"
              aria-label="Change photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Admin Info & Role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                {activeUser?.displayName || 'Administrator'}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                ADMIN
              </span>
            </div>

            {/* Username Tag */}
            <div className="flex items-center gap-1.5 mb-3">
              <button
                onClick={handleCopyUsername}
                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all"
                title="Click to copy username"
              >
                <AtSign className="w-3 h-3 text-[#FE2C55]" />
                <span>{displayUsername}</span>
                {copiedUsername ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-500 group-hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            </div>

            {/* Platform Quick Stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs select-none">
              <div className="p-2 rounded-xl bg-zinc-900 border border-white/5">
                <span className="font-black text-white text-sm block">
                  {adminStats?.totalConsumers ?? '-'}
                </span>
                <span className="text-[10px] text-gray-400">Consumers</span>
              </div>
              <div className="p-2 rounded-xl bg-zinc-900 border border-white/5">
                <span className="font-black text-amber-400 text-sm block">
                  {adminStats?.totalCreators ?? '-'}
                </span>
                <span className="text-[10px] text-gray-400">Creators</span>
              </div>
              <div className="p-2 rounded-xl bg-zinc-900 border border-white/5">
                <span className="font-black text-violet-400 text-sm block">
                  {adminStats?.totalVideos ?? '-'}
                </span>
                <span className="text-[10px] text-gray-400">Videos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold text-rose-400 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            Platform Administrator & Security
          </p>

          {activeUser?.bio ? (
            <p className="text-sm text-gray-200 whitespace-pre-line leading-relaxed">
              {activeUser.bio}
            </p>
          ) : (
            <button
              onClick={handleOpenEditModal}
              className="text-xs font-semibold text-[#FE2C55] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add admin bio
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 mt-5 flex-wrap">
          <button
            onClick={handleOpenEditModal}
            className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20 flex items-center justify-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </button>

          <button
            onClick={() => navigate('admin-dashboard')}
            className="flex-1 min-w-[150px] py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 text-white font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Admin Portal
          </button>

          <button
            onClick={handleShare}
            className="w-11 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center border border-white/10 transition-all shadow-lg shrink-0"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="max-w-2xl mx-auto mt-4">
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex-1 py-3 text-center text-sm font-bold transition-colors relative flex items-center justify-center gap-1.5 ${
              activeTab === 'applications' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span>Applications ({applicationsList.length})</span>
            {activeTab === 'applications' && (
              <motion.div
                layoutId="adminProfileTabLine"
                className="absolute bottom-0 inset-x-6 h-0.5 bg-[#FE2C55]"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('liked')}
            className={`flex-1 py-3 text-center text-sm font-bold transition-colors relative flex items-center justify-center gap-1.5 ${
              activeTab === 'liked' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
            <span>Liked Videos</span>
            {activeTab === 'liked' && (
              <motion.div
                layoutId="adminProfileTabLine"
                className="absolute bottom-0 inset-x-6 h-0.5 bg-[#FE2C55]"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ratings')}
            className={`flex-1 py-3 text-center text-sm font-bold transition-colors relative flex items-center justify-center gap-1.5 ${
              activeTab === 'ratings' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            <span>Ratings</span>
            {activeTab === 'ratings' && (
              <motion.div
                layoutId="adminProfileTabLine"
                className="absolute bottom-0 inset-x-6 h-0.5 bg-[#FE2C55]"
              />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* TAB 1: PENDING CREATOR APPLICATIONS */}
          {activeTab === 'applications' && (
            appsLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#FE2C55]" />
              </div>
            ) : applicationsList.length > 0 ? (
              <div className="space-y-3">
                {applicationsList.map((app: CreatorApplicationItem) => (
                  <div
                    key={app.id}
                    className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={app.user.avatarUrl}
                          name={app.user.displayName}
                          size="md"
                          bordered
                        />
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            {app.user.displayName}
                          </h4>
                          <p className="text-xs text-gray-400 font-mono">
                            @{app.user.username || app.user.email}
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase">
                        {app.category}
                      </span>
                    </div>

                    {app.description && (
                      <p className="text-xs text-gray-300 bg-white/5 p-2.5 rounded-xl border border-white/5">
                        <span className="font-semibold text-gray-400 block mb-1">Content Plan:</span>
                        {app.description}
                      </p>
                    )}

                    {app.socialLink && (
                      <p className="text-xs text-[#25F4EE] truncate">
                        🔗 Portfolio/Channel:{' '}
                        <a
                          href={app.socialLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {app.socialLink}
                        </a>
                      </p>
                    )}

                    {/* Review Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <button
                        onClick={() => handleReviewApplication(app.id, 'APPROVED')}
                        disabled={reviewingId === app.id}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {reviewingId === app.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        Approve Creator
                      </button>
                      <button
                        onClick={() => handleReviewApplication(app.id, 'REJECTED')}
                        disabled={reviewingId === app.id}
                        className="px-4 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/50 border border-red-500/30 text-red-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-gray-500 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">No pending applications</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  All creator applications have been reviewed.
                </p>
              </div>
            )
          )}

          {/* TAB 2: LIKED VIDEOS */}
          {activeTab === 'liked' && (
            likedLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#FE2C55]" />
              </div>
            ) : likedVideosList.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {likedVideosList.map((v: FeedVideo) => {
                  const gradient = GENRE_GRADIENTS[v.genre] || GENRE_GRADIENTS.OTHER
                  return (
                    <div
                      key={v.id}
                      onClick={() => navigate('video-detail', v.id)}
                      className="aspect-[9/16] rounded-xl overflow-hidden relative cursor-pointer group bg-zinc-900 border border-white/10 shadow-md"
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-b ${gradient} group-hover:scale-105 transition-transform duration-300`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                        <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                      <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between text-[11px] font-semibold text-white">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-gray-300" />
                          {formatNumber(v.viewCount || 0)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 uppercase truncate max-w-[60px]">
                          {v.creator?.creatorName || v.genre}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-gray-500">
                <p className="text-xs">No liked videos yet</p>
              </div>
            )
          )}

          {/* TAB 3: RATINGS */}
          {activeTab === 'ratings' && (
            ratingsLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#FE2C55]" />
              </div>
            ) : myRatingsList.length > 0 ? (
              <div className="space-y-3">
                {myRatingsList.map((item: ConsumerRatingItem) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          src={item.creator.avatarUrl}
                          name={item.creator.displayName}
                          size="sm"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-white">
                            {item.creator.displayName}
                          </h4>
                          <p className="text-[10px] text-gray-400">@{item.creator.username}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-400">
                        ⭐ {item.overallRating.toFixed(1)} / 10
                      </span>
                    </div>
                    {item.review && (
                      <p className="text-xs text-gray-300 italic">"{item.review}"</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-gray-500">
                <p className="text-xs">No submitted ratings yet</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* ADMIN EDIT PROFILE MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white flex items-center justify-between">
              <span>Edit Administrator Profile</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            {/* Avatar */}
            <div className="flex flex-col items-center justify-center gap-3 py-2 border-b border-white/10 pb-4">
              <div
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <UserAvatar
                  src={editAvatarUrl}
                  name={editDisplayName}
                  size="2xl"
                  bordered
                />
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarFileChange}
                accept="image/*"
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      {editAvatarUrl ? 'Change Photo' : 'Upload Photo'}
                    </>
                  )}
                </button>
                {editAvatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-500/20 text-xs font-semibold text-red-400 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">Unique Username</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                  @
                </span>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) =>
                    setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))
                  }
                  placeholder="admin"
                  maxLength={30}
                  required
                  className="w-full rounded-xl bg-zinc-900 border border-white/10 pl-8 pr-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FE2C55] font-mono"
                />
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">Display Name</label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Admin Name"
                maxLength={50}
                required
                className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FE2C55]"
              />
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">Bio</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Administrator profile bio..."
                className="w-full rounded-xl bg-zinc-900 border border-white/10 p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FE2C55] resize-none"
              />
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">Gender</label>
              <select
                value={editGender}
                onChange={(e) => setEditGender(e.target.value)}
                className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#FE2C55]"
              >
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="NON_BINARY">Non-binary</option>
              </select>
            </div>

            {/* Save Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
