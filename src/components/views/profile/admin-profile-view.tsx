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
    queryKey: ['user-me', user?.id],
    queryFn: getMyProfile,
    enabled: !!user,
  })

  // Admin Dashboard stats
  const { data: adminStats } = useQuery({
    queryKey: ['admin-dashboard', user?.id],
    queryFn: getAdminDashboard,
    enabled: !!user,
  })

  // Pending creator applications
  const { data: applicationsData, isLoading: appsLoading } = useQuery({
    queryKey: ['admin-creator-applications', user?.id, 'PENDING'],
    queryFn: () => getAdminCreatorApplications({ status: 'PENDING', limit: 20 }),
    enabled: !!user,
  })

  // Fetch personal liked videos
  const { data: likedVideosData, isLoading: likedLoading } = useQuery({
    queryKey: ['my-liked-videos', user?.id],
    queryFn: getMyLikedVideos,
    enabled: !!user,
  })

  // Fetch personal submitted ratings
  const { data: myRatingsData, isLoading: ratingsLoading } = useQuery({
    queryKey: ['my-ratings', user?.id],
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
        avatarUrl: editAvatarUrl === null ? null : editAvatarUrl,
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
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#5E70FF] text-white flex items-center justify-center border-2 border-black shadow-lg hover:scale-110 transition-transform"
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
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[#5E70FF]/20 text-[#5E70FF] border border-[#5E70FF]/30 flex items-center gap-1">
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
                <AtSign className="w-3 h-3 text-[#5E70FF]" />
                <span>{displayUsername}</span>
                {copiedUsername ? (
                  <Check className="w-3 h-3 text-[#48B321]" />
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
                <span className="font-black text-[#24BBA9] text-sm block">
                  {adminStats?.totalCreators ?? '-'}
                </span>
                <span className="text-[10px] text-gray-400">Creators</span>
              </div>
              <div className="p-2 rounded-xl bg-zinc-900 border border-white/5">
                <span className="font-black text-[#5E70FF] text-sm block">
                  {adminStats?.totalVideos ?? '-'}
                </span>
                <span className="text-[10px] text-gray-400">Videos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold text-[#5E70FF] flex items-center gap-1">
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
              className="text-xs font-semibold text-[#5E70FF] hover:underline flex items-center gap-1"
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
            className="flex-1 min-w-[150px] py-2.5 rounded-xl bg-gradient-to-r from-[#5E70FF] to-[#24BBA9] hover:opacity-90 text-white font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2"
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
            <UserCheck className="w-4 h-4 text-[#24BBA9]" />
            <span>Applications ({applicationsList.length})</span>
            {activeTab === 'applications' && (
              <motion.div
                layoutId="adminProfileTabLine"
                className="absolute bottom-0 inset-x-6 h-0.5 bg-[#5E70FF]"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('liked')}
            className={`flex-1 py-3 text-center text-sm font-bold transition-colors relative flex items-center justify-center gap-1.5 ${
              activeTab === 'liked' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Heart className="w-4 h-4 text-[#DF4D50] fill-[#DF4D50]/20" />
            <span>Liked Videos</span>
            {activeTab === 'liked' && (
              <motion.div
                layoutId="adminProfileTabLine"
                className="absolute bottom-0 inset-x-6 h-0.5 bg-[#5E70FF]"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ratings')}
            className={`flex-1 py-3 text-center text-sm font-bold transition-colors relative flex items-center justify-center gap-1.5 ${
              activeTab === 'ratings' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Star className="w-4 h-4 text-[#FF8D28] fill-[#FF8D28]/20" />
            <span>Ratings</span>
            {activeTab === 'ratings' && (
              <motion.div
                layoutId="adminProfileTabLine"
                className="absolute bottom-0 inset-x-6 h-0.5 bg-[#5E70FF]"
              />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* TAB 1: ADMINISTRATIVE HUBS & OPERATIONS */}
          {activeTab === 'applications' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#5E70FF]/15 to-zinc-900 border border-[#5E70FF]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#5E70FF]/20 text-[#5E70FF]">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">VidFlow Executive Control Center</h3>
                      <p className="text-xs text-zinc-400">Platform moderation, creator approvals, and audit records</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('admin-dashboard')}
                  className="w-full py-2.5 rounded-xl bg-[#5E70FF] hover:bg-[#4D5FE8] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#5E70FF]/25 transition-all"
                >
                  <span>Launch Full Control Center</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={() => navigate('admin-applications')}
                  className="p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-[#24BBA9]/30 text-left transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-4 h-4 text-[#24BBA9]" />
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-[#24BBA9] transition-colors">
                        Creator Applications
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {applicationsList.length} pending review
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                </button>

                <button
                  onClick={() => navigate('admin-users')}
                  className="p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-[#5E70FF]" />
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-[#5E70FF] transition-colors">
                        User Operations
                      </p>
                      <p className="text-[10px] text-zinc-400">Manage consumers & creators</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                </button>

                <button
                  onClick={() => navigate('admin-videos')}
                  className="p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Film className="w-4 h-4 text-[#5E70FF]" />
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-[#5E70FF] transition-colors">
                        Video Moderation
                      </p>
                      <p className="text-[10px] text-zinc-400">Review & publish media</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                </button>

                <button
                  onClick={() => navigate('admin-audit-logs')}
                  className="p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[#48B321]" />
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-[#48B321] transition-colors">
                        Audit Log Trail
                      </p>
                      <p className="text-[10px] text-zinc-400">Immutable security logs</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: LIKED VIDEOS */}
          {activeTab === 'liked' && (
            likedLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#5E70FF]" />
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
                        <Heart className="w-3.5 h-3.5 text-[#DF4D50] fill-[#DF4D50]" />
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
                <Loader2 className="w-8 h-8 animate-spin text-[#5E70FF]" />
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
                      <span className="text-xs font-bold text-[#FF8D28]">
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
                    className="px-3 py-1.5 rounded-lg bg-[#DF4D50]/20 hover:bg-[#DF4D50]/30 border border-[#DF4D50]/30 text-xs font-semibold text-[#DF4D50] transition-colors flex items-center gap-1.5"
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
                  className="w-full rounded-xl bg-zinc-900 border border-white/10 pl-8 pr-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#5E70FF] font-mono"
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
                className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#5E70FF]"
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
                className="w-full rounded-xl bg-zinc-900 border border-white/10 p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#5E70FF] resize-none"
              />
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">Gender</label>
              <select
                value={editGender}
                onChange={(e) => setEditGender(e.target.value)}
                className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#5E70FF]"
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
                className="flex-1 py-2.5 rounded-xl bg-[#5E70FF] hover:bg-[#4D5FE8] text-white font-bold text-xs shadow-lg shadow-[#5E70FF]/25 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
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
