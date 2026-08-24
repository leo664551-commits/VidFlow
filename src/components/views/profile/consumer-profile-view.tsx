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
  applyToBeCreator,
  getCreatorApplicationStatus,
  rateCreator,
  deleteCreatorRating,
  toggleLike,
} from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useVideoKeyboardShortcuts } from '@/hooks/use-video-keyboard-shortcuts'
import {
  Loader2,
  ArrowLeft,
  Share2,
  Pencil,
  Sparkles,
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
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FollowListModal } from '@/components/modals/follow-list-modal'
import { CATEGORY_MAP, REVIEW_TAG_OPTIONS } from '../creator-profile-view'
import { UserAvatar } from '@/components/common/user-avatar'
import { ConsumerRatingItem, FeedVideo } from '@/types'

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

export function ConsumerProfileView() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const navigate = useAppStore((s) => s.navigate)
  const goBack = useAppStore((s) => s.goBack)
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'liked' | 'ratings'>('liked')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [becomeCreatorModalOpen, setBecomeCreatorModalOpen] = useState(false)
  const [copiedUsername, setCopiedUsername] = useState(false)

  // Edit personal profile form states
  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || '')
  const [editUsername, setEditUsername] = useState(user?.username || '')
  const [editBio, setEditBio] = useState(user?.bio || '')
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(user?.avatarUrl || null)
  const [editGender, setEditGender] = useState(user?.gender || 'PREFER_NOT_TO_SAY')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [followModalOpen, setFollowModalOpen] = useState(false)
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers')

  // Become a Creator modal state
  const [applyCategory, setApplyCategory] = useState('Comedy')
  const [applyCustomCategory, setApplyCustomCategory] = useState('')
  const [applyDescription, setApplyDescription] = useState('')
  const [applySocialLink, setApplySocialLink] = useState('')
  const [applying, setApplying] = useState(false)

  // Edit rating modal state
  const [editingRatingItem, setEditingRatingItem] = useState<ConsumerRatingItem | null>(null)
  const [editRatingScore, setEditRatingScore] = useState(9)
  const [editQuality, setEditQuality] = useState(9)
  const [editValue, setEditValue] = useState(9)
  const [editCreativity, setEditCreativity] = useState(8)
  const [editEntertainment, setEditEntertainment] = useState(9)
  const [editConsistency, setEditConsistency] = useState(9)
  const [editReviewText, setEditReviewText] = useState('')
  const [editSelectedTags, setEditSelectedTags] = useState<string[]>([])
  const [submittingRating, setSubmittingRating] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Authoritative fresh profile query
  const { data: userProfile } = useQuery({
    queryKey: ['user-me', user?.id],
    queryFn: getMyProfile,
    enabled: !!user,
  })

  // Check creator application status
  const { data: applicationStatus } = useQuery({
    queryKey: ['creator-application-status', user?.id],
    queryFn: getCreatorApplicationStatus,
    enabled: !!user,
  })

  // Fetch private liked videos
  const { data: likedVideosData, isLoading: likedLoading } = useQuery({
    queryKey: ['my-liked-videos', user?.id],
    queryFn: getMyLikedVideos,
    enabled: !!user,
  })

  // Fetch private submitted ratings
  const { data: myRatingsData, isLoading: ratingsLoading } = useQuery({
    queryKey: ['my-ratings', user?.id],
    queryFn: getMyRatings,
    enabled: !!user,
  })

  const activeUser = userProfile || user
  const followersCount = activeUser?.followerCount ?? 0
  const followingCount = activeUser?.followingCount ?? 0
  const displayUsername =
    activeUser?.username ||
    activeUser?.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') ||
    `user_${activeUser?.id.slice(-4)}`

  const likedVideosList = likedVideosData?.data || []
  const myRatingsList = myRatingsData?.data || []

  const [focusedLikedIndex, setFocusedLikedIndex] = useState<number>(-1)

  // Like mutation for keyboard shortcut
  const toggleLikeMutation = useMutation({
    mutationFn: (vidId: string) => toggleLike(vidId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-liked-videos'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  const activeLikedVideo =
    activeTab === 'liked' && focusedLikedIndex >= 0 ? likedVideosList[focusedLikedIndex] : null

  const handleOpenLikedVideo = (v: { id: string }) => {
    navigate('video-detail', v.id, {
      source: 'liked-videos',
      videoIds: likedVideosList.map((item) => item.id),
    })
  }

  // Global Video Keyboard Shortcuts for Consumer Liked Videos
  useVideoKeyboardShortcuts({
    onNext: () => {
      if (likedVideosList.length === 0) return
      setFocusedLikedIndex((prev) => (prev < likedVideosList.length - 1 ? prev + 1 : prev))
    },
    onPrev: () => {
      if (likedVideosList.length === 0) return
      setFocusedLikedIndex((prev) => (prev > 0 ? prev - 1 : 0))
    },
    onTogglePlay: () => {
      if (activeLikedVideo) {
        handleOpenLikedVideo(activeLikedVideo)
      } else if (likedVideosList.length > 0) {
        handleOpenLikedVideo(likedVideosList[0])
      }
    },
    onToggleLike: () => {
      if (!activeLikedVideo) return
      toggleLikeMutation.mutate(activeLikedVideo.id)
    },
    enabled:
      activeTab === 'liked' &&
      !editModalOpen &&
      !becomeCreatorModalOpen &&
      !followModalOpen &&
      !editingRatingItem &&
      likedVideosList.length > 0,
  })

  // Open edit modal and populate state
  const handleOpenEditModal = () => {
    setEditDisplayName(activeUser?.displayName || '')
    setEditUsername(displayUsername)
    setEditBio(activeUser?.bio || '')
    setEditAvatarUrl(activeUser?.avatarUrl || null)
    setEditGender(activeUser?.gender || 'PREFER_NOT_TO_SAY')
    setEditModalOpen(true)
  }

  // Handle avatar file selection & permanent storage upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WebP)')
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
      if (user) {
        setUser({ ...user, avatarUrl: res.avatarUrl })
      }
      queryClient.invalidateQueries({ queryKey: ['user-me'] })
      toast.success('Avatar uploaded!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Avatar upload failed')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Handle avatar removal
  const handleRemoveAvatar = async () => {
    try {
      await deleteAvatar()
      setEditAvatarUrl(null)
      if (user) {
        setUser({ ...user, avatarUrl: null })
      }
      queryClient.invalidateQueries({ queryKey: ['user-me'] })
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
        avatarUrl: editAvatarUrl === null ? null : editAvatarUrl || undefined,
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
      toast.success('Profile updated successfully!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  // Submit Creator Application
  const handleApplyCreator = async (e: React.FormEvent) => {
    e.preventDefault()
    const chosenCategory =
      applyCategory === 'Other' ? applyCustomCategory.trim() || 'Other' : applyCategory

    setApplying(true)
    try {
      const res = await applyToBeCreator({
        category: chosenCategory,
        description: applyDescription.trim() || undefined,
        socialLink: applySocialLink.trim() || undefined,
      })

      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['creator-application-status'] })
      setBecomeCreatorModalOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Application submission failed')
    } finally {
      setApplying(false)
    }
  }

  // Open Edit Rating dialog
  const handleOpenEditRating = (ratingItem: ConsumerRatingItem) => {
    setEditingRatingItem(ratingItem)
    setEditRatingScore(ratingItem.overallRating || 9)
    setEditQuality(ratingItem.contentQuality || 9)
    setEditValue(ratingItem.valueRating || 9)
    setEditCreativity(ratingItem.creativityRating || 8)
    setEditEntertainment(ratingItem.entertainmentRating || 9)
    setEditConsistency(ratingItem.consistencyRating || 9)
    setEditReviewText(ratingItem.review || '')
    setEditSelectedTags(ratingItem.tags || [])
  }

  // Submit edited rating
  const handleSaveRating = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRatingItem) return

    setSubmittingRating(true)
    try {
      await rateCreator(editingRatingItem.creatorId, {
        overallRating: editRatingScore,
        contentQuality: editQuality,
        valueRating: editValue,
        creativityRating: editCreativity,
        entertainmentRating: editEntertainment,
        consistencyRating: editConsistency,
        review: editReviewText.trim() || undefined,
        tags: editSelectedTags,
      })

      queryClient.invalidateQueries({ queryKey: ['my-ratings'] })
      queryClient.invalidateQueries({ queryKey: ['creator-profile', editingRatingItem.creatorId] })
      queryClient.invalidateQueries({ queryKey: ['creator', editingRatingItem.creatorId] })
      toast.success('Your rating has been updated!')
      setEditingRatingItem(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update rating')
    } finally {
      setSubmittingRating(false)
    }
  }

  // Delete rating
  const handleDeleteRating = async (creatorId: string) => {
    try {
      await deleteCreatorRating(creatorId)
      queryClient.invalidateQueries({ queryKey: ['my-ratings'] })
      queryClient.invalidateQueries({ queryKey: ['creator-profile', creatorId] })
      queryClient.invalidateQueries({ queryKey: ['creator', creatorId] })
      toast.success('Rating deleted')
      setEditingRatingItem(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete rating')
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
    const url = window.location.origin
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${activeUser?.displayName || 'User'} on VidFlow`,
          text: `Check out @${displayUsername} on VidFlow!`,
          url,
        })
        return
      } catch {}
    }
    navigator.clipboard.writeText(url)
    toast.success('Profile link copied to clipboard!')
  }

  const toggleTag = (tag: string) => {
    if (editSelectedTags.includes(tag)) {
      setEditSelectedTags(editSelectedTags.filter((t) => t !== tag))
    } else {
      if (editSelectedTags.length >= 4) {
        toast.info('You can choose up to 4 tags')
        return
      }
      setEditSelectedTags([...editSelectedTags, tag])
    }
  }

  const isApplicationPending =
    applicationStatus?.hasApplication && applicationStatus.application?.status === 'PENDING'

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
            {activeUser?.displayName || 'Viewer Profile'}
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
            {/* Quick edit photo overlay */}
            <button
              onClick={handleOpenEditModal}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#5E70FF] hover:bg-[#4D5FE8] text-white flex items-center justify-center border-2 border-black shadow-lg hover:scale-110 transition-transform"
              aria-label="Change photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* User Info & Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                {activeUser?.displayName || 'User'}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[#5E70FF]/20 text-[#5E70FF] border border-[#5E70FF]/30">
                CONSUMER
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

            {/* Authoritative Follower / Following Counts (No 0 Posts) */}
            <div className="flex items-center gap-5 sm:gap-7 text-sm select-none">
              <button
                type="button"
                onClick={() => {
                  setFollowModalTab('followers')
                  setFollowModalOpen(true)
                }}
                className="flex flex-col sm:flex-row sm:items-center sm:gap-1 group cursor-pointer hover:opacity-80 transition-opacity text-left"
              >
                <span className="font-bold text-white text-base group-hover:text-[#5E70FF] transition-colors">
                  {formatNumber(followersCount)}
                </span>
                <span className="text-gray-400 text-xs sm:text-sm">followers</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFollowModalTab('following')
                  setFollowModalOpen(true)
                }}
                className="flex flex-col sm:flex-row sm:items-center sm:gap-1 group cursor-pointer hover:opacity-80 transition-opacity text-left"
              >
                <span className="font-bold text-white text-base group-hover:text-[#5E70FF] transition-colors">
                  {formatNumber(followingCount)}
                </span>
                <span className="text-gray-400 text-xs sm:text-sm">following</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bio & Role details */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold text-[#24BBA9] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            VidFlow Viewer
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
              Add a bio to your profile
            </button>
          )}
        </div>

        {/* Pending Creator Application Notice */}
        {isApplicationPending && (
          <div className="mt-3 p-3 rounded-2xl bg-[#FF8D28]/10 border border-[#FF8D28]/20 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#FF8D28] shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-[#FF8D28]">Creator Application Under Review: </span>
              <span className="text-gray-300">
                You applied for {applicationStatus?.application?.category} niche. An administrator will review your application soon.
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 mt-5 flex-wrap">
          <button
            onClick={handleOpenEditModal}
            className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20 flex items-center justify-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </button>

          {!isApplicationPending ? (
            <button
              onClick={() => setBecomeCreatorModalOpen(true)}
              className="flex-1 min-w-[150px] py-2.5 rounded-xl bg-gradient-to-r from-[#5E70FF] to-[#24BBA9] hover:opacity-90 text-white font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Become a Creator
            </button>
          ) : (
            <div className="flex-1 min-w-[150px] py-2.5 rounded-xl bg-zinc-900 border border-[#FF8D28]/30 text-[#FF8D28] font-bold text-xs flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Application Pending
            </div>
          )}

          <button
            onClick={handleShare}
            className="w-11 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center border border-white/10 transition-all shadow-lg shrink-0"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Consumer Navigation Tabs */}
      <div className="max-w-2xl mx-auto mt-4">
        <div className="flex border-b border-white/10">
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
                layoutId="consumerProfileTabLine"
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
            <span>My Ratings</span>
            {activeTab === 'ratings' && (
              <motion.div
                layoutId="consumerProfileTabLine"
                className="absolute bottom-0 inset-x-6 h-0.5 bg-[#5E70FF]"
              />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* TAB 1: LIKED VIDEOS */}
          {activeTab === 'liked' && (
            likedLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#5E70FF]" />
              </div>
            ) : likedVideosList.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {likedVideosList.map((v: FeedVideo, idx: number) => {
                  const gradient = GENRE_GRADIENTS[v.genre] || GENRE_GRADIENTS.OTHER
                  const isFocused = idx === focusedLikedIndex
                  const thumbUrl = v.thumbnailBlobName
                    ? (v.thumbnailBlobName.startsWith('data:') ||
                       v.thumbnailBlobName.startsWith('/') ||
                       v.thumbnailBlobName.startsWith('http')
                        ? v.thumbnailBlobName
                        : `/uploads/videos/${v.thumbnailBlobName}`)
                    : null

                  return (
                    <div
                      key={v.id}
                      onClick={() => handleOpenLikedVideo(v)}
                      className={`aspect-[9/16] rounded-xl overflow-hidden relative cursor-pointer group bg-zinc-900 border transition-all ${
                        isFocused
                          ? 'border-[#24BBA9] ring-2 ring-[#24BBA9] shadow-[0_0_20px_rgba(36,187,169,0.4)] scale-[1.02]'
                          : 'border-white/10 shadow-md hover:border-white/30'
                      }`}
                    >
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={v.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div
                          className={`absolute inset-0 bg-gradient-to-b ${gradient} group-hover:scale-105 transition-transform duration-300`}
                        />
                      )}
                      <div className={`absolute inset-0 flex items-center justify-center transition-opacity bg-black/30 z-10 ${
                        isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                      <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-2 z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between text-[11px] font-semibold text-white">
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
              <div className="py-16 text-center text-gray-500 space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#DF4D50]/10 border border-[#DF4D50]/30 text-[#DF4D50] flex items-center justify-center mx-auto">
                  <Heart className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">No liked videos yet</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Videos you like while browsing the feed will appear here privately.
                </p>
                <button
                  onClick={() => navigate('feed')}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all inline-flex items-center gap-2 border border-white/10"
                >
                  <Play className="w-3.5 h-3.5" />
                  Explore Feed
                </button>
              </div>
            )
          )}

          {/* TAB 2: MY RATINGS */}
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
                    className="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-3 hover:border-white/20 transition-all shadow-md"
                  >
                    {/* Creator Info & Overall Score */}
                    <div className="flex items-center justify-between">
                      <div
                        onClick={() => {
                          useAppStore.getState().setSelectedCreatorId(item.creator.id)
                          navigate('creator-profile')
                        }}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <UserAvatar
                          src={item.creator.avatarUrl}
                          name={item.creator.displayName}
                          size="md"
                          bordered
                        />
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-[#5E70FF] transition-colors">
                            {item.creator.displayName || item.creator.creatorName}
                          </h4>
                          <p className="text-[11px] text-gray-400 font-mono">
                            @{item.creator.username}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#FF8D28]/20 to-[#FF8D28]/10 border border-[#FF8D28]/30 text-[#FF8D28] font-black text-sm flex items-center gap-1.5">
                          <Star className="w-4 h-4 fill-[#FF8D28] text-[#FF8D28]" />
                          <span>{item.overallRating.toFixed(1)} / 10</span>
                        </div>
                        <button
                          onClick={() => handleOpenEditRating(item)}
                          className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all border border-white/10 flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                      </div>
                    </div>

                    {/* 5-Dimension Score Breakdown */}
                    <div className="grid grid-cols-5 gap-1.5 py-2 px-3 rounded-xl bg-black/40 border border-white/5 text-center">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">Quality</span>
                        <span className="text-xs font-black text-white">
                          {item.contentQuality ?? '-'}/10
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">Value</span>
                        <span className="text-xs font-black text-white">
                          {item.valueRating ?? '-'}/10
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">Creativity</span>
                        <span className="text-xs font-black text-white">
                          {item.creativityRating ?? '-'}/10
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">Fun</span>
                        <span className="text-xs font-black text-white">
                          {item.entertainmentRating ?? '-'}/10
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">Consistency</span>
                        <span className="text-xs font-black text-white">
                          {item.consistencyRating ?? '-'}/10
                        </span>
                      </div>
                    </div>

                    {/* Compliment Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-gray-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Review text */}
                    {item.review && (
                      <p className="text-xs text-gray-300 italic bg-white/5 p-2.5 rounded-xl border border-white/5">
                        "{item.review}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-gray-500 space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#FF8D28]/10 border border-[#FF8D28]/20 text-[#FF8D28] flex items-center justify-center mx-auto">
                  <Star className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">No ratings submitted yet</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Watch 3+ videos from creators to unlock ratings and submit your qualified reviews.
                </p>
                <button
                  onClick={() => navigate('feed')}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all inline-flex items-center gap-2 border border-white/10"
                >
                  <Play className="w-3.5 h-3.5" />
                  Discover Creators
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* 1. CLEAN CONSUMER EDIT PROFILE MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white flex items-center justify-between">
              <span>Edit Profile</span>
              <span className="text-xs font-normal text-gray-400">Personal Info</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            {/* Avatar Picker with Permanent Storage Upload */}
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
                    className="px-3 py-1.5 rounded-lg bg-[#DF4D50]/15 hover:bg-[#DF4D50]/25 border border-[#DF4D50]/30 text-xs font-semibold text-[#DF4D50] transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Unique Username (@handle) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>Unique Username</span>
                <span className="text-[10px] text-[#24BBA9] font-normal">Cannot be duplicated</span>
              </label>
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
                  placeholder="username"
                  maxLength={30}
                  required
                  className="w-full rounded-xl bg-zinc-900 border border-white/10 pl-8 pr-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#5E70FF] transition-all font-mono"
                />
              </div>
              <p className="text-[11px] text-gray-500">
                Unique identifier for your account. Other viewers can mention you with @{editUsername || 'username'}.
              </p>
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">Display Name</label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Your Display Name"
                maxLength={50}
                required
                className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#5E70FF] transition-all"
              />
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-300">Bio</label>
                <span className="text-[10px] text-gray-500">{editBio.length}/500</span>
              </div>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Tell the community about yourself..."
                className="w-full rounded-xl bg-zinc-900 border border-white/10 p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#5E70FF] transition-all resize-none"
              />
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">Gender</label>
              <select
                value={editGender}
                onChange={(e) => setEditGender(e.target.value)}
                className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#5E70FF] transition-all"
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
                className="flex-1 py-2.5 rounded-xl bg-[#5E70FF] hover:bg-[#4D5FE8] text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
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

      {/* 2. BECOME A CREATOR MODAL */}
      <Dialog open={becomeCreatorModalOpen} onOpenChange={setBecomeCreatorModalOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#5E70FF]" />
              <span>Apply to Become a Creator</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleApplyCreator} className="space-y-4 pt-2">
            <p className="text-xs text-gray-400">
              Submit your application to share your videos on VidFlow. An administrator will review your application before creator permissions are enabled.
            </p>

            {/* Category / Niche Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300">
                Select Your Content Category / Niche
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CATEGORY_MAP).map(([key, item]) => {
                  const isSelected = applyCategory === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setApplyCategory(key)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border text-left ${
                        isSelected
                          ? 'bg-[#5E70FF] text-white border-[#5E70FF] shadow-md scale-[1.02]'
                          : 'bg-zinc-900 text-gray-300 border-white/10 hover:bg-zinc-800'
                      }`}
                    >
                      <span className="text-base shrink-0">{item.emoji}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>

              {applyCategory === 'Other' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={applyCustomCategory}
                    onChange={(e) => setApplyCustomCategory(e.target.value)}
                    placeholder="Enter custom niche..."
                    maxLength={40}
                    className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#5E70FF]"
                  />
                </div>
              )}
            </div>

            {/* Channel Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">
                Tell Us About Your Planned Content (Optional)
              </label>
              <textarea
                value={applyDescription}
                onChange={(e) => setApplyDescription(e.target.value)}
                maxLength={400}
                rows={2}
                placeholder="What topics will your videos cover?"
                className="w-full rounded-xl bg-zinc-900 border border-white/10 p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#5E70FF] transition-all resize-none"
              />
            </div>

            {/* Social Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">
                Portfolio or Existing Channel Link (Optional)
              </label>
              <input
                type="text"
                value={applySocialLink}
                onChange={(e) => setApplySocialLink(e.target.value)}
                placeholder="https://youtube.com/@yourchannel or instagram.com/..."
                className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#5E70FF]"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setBecomeCreatorModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={applying}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#5E70FF] to-[#24BBA9] text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. EDIT MY RATING MODAL */}
      <Dialog
        open={!!editingRatingItem}
        onOpenChange={(open) => !open && setEditingRatingItem(null)}
      >
        <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white flex items-center justify-between">
              <span>Edit Your Rating</span>
              <span className="text-xs font-bold text-[#FF8D28]">
                ⭐ {editRatingScore.toFixed(1)} / 10
              </span>
            </DialogTitle>
          </DialogHeader>

          {editingRatingItem && (
            <form onSubmit={handleSaveRating} className="space-y-4 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900 border border-white/10">
                <UserAvatar
                  src={editingRatingItem.creator.avatarUrl}
                  name={editingRatingItem.creator.displayName}
                  size="md"
                  bordered
                />
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {editingRatingItem.creator.displayName || editingRatingItem.creator.creatorName}
                  </h4>
                  <p className="text-[11px] text-gray-400 font-mono">
                    @{editingRatingItem.creator.username}
                  </p>
                </div>
              </div>

              {/* Overall Score Slider */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-zinc-900 border border-white/10">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-gray-300">Overall Rating</span>
                  <span className="text-[#FF8D28] font-black text-base">
                    {editRatingScore.toFixed(1)} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={editRatingScore}
                  onChange={(e) => setEditRatingScore(parseFloat(e.target.value))}
                  className="w-full accent-[#5E70FF] h-2 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* 5 Sub-dimensions */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10">
                <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Quality Dimensions
                </h5>

                {/* Quality */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300">🎬 Content Quality</span>
                    <span className="font-bold text-white">{editQuality}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={editQuality}
                    onChange={(e) => setEditQuality(parseInt(e.target.value))}
                    className="w-full accent-[#5E70FF] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Value */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300">💡 Value & Knowledge</span>
                    <span className="font-bold text-white">{editValue}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={editValue}
                    onChange={(e) => setEditValue(parseInt(e.target.value))}
                    className="w-full accent-[#5E70FF] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Creativity */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300">🎨 Creativity & Style</span>
                    <span className="font-bold text-white">{editCreativity}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={editCreativity}
                    onChange={(e) => setEditCreativity(parseInt(e.target.value))}
                    className="w-full accent-[#5E70FF] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Entertainment */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300">🎉 Entertainment</span>
                    <span className="font-bold text-white">{editEntertainment}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={editEntertainment}
                    onChange={(e) => setEditEntertainment(parseInt(e.target.value))}
                    className="w-full accent-[#5E70FF] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Consistency */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300">⚡ Consistency</span>
                    <span className="font-bold text-white">{editConsistency}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={editConsistency}
                    onChange={(e) => setEditConsistency(parseInt(e.target.value))}
                    className="w-full accent-[#5E70FF] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Compliments */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Compliment Badges</label>
                <div className="flex flex-wrap gap-1.5">
                  {REVIEW_TAG_OPTIONS.map((tag) => {
                    const isSelected = editSelectedTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                          isSelected
                            ? 'bg-[#5E70FF] text-white border-[#5E70FF]'
                            : 'bg-zinc-900 text-gray-300 border-white/10 hover:bg-zinc-800'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Review */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">
                  Written Feedback (Optional)
                </label>
                <textarea
                  value={editReviewText}
                  onChange={(e) => setEditReviewText(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Share details on why you rated this creator..."
                  className="w-full rounded-xl bg-zinc-900 border border-white/10 p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#5E70FF] resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => handleDeleteRating(editingRatingItem.creatorId)}
                  className="px-3 py-2.5 rounded-xl bg-[#DF4D50]/15 hover:bg-[#DF4D50]/25 text-[#DF4D50] border border-[#DF4D50]/30 text-xs font-bold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRatingItem(null)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRating}
                  className="flex-1 py-2.5 rounded-xl bg-[#5E70FF] hover:bg-[#4D5FE8] text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submittingRating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Rating'
                  )}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Follow List Modal */}
      {followModalOpen && (
        <FollowListModal
          isOpen={followModalOpen}
          onClose={() => setFollowModalOpen(false)}
          initialTab={followModalTab}
          userId={activeUser?.id || ''}
          title={activeUser?.displayName || displayUsername}
        />
      )}
    </div>
  )
}
