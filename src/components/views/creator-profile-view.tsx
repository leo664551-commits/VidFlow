'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import {
  getCreatorProfile,
  rateCreator,
  deleteCreatorRating,
  toggleFollowCreator,
  toggleLike,
} from '@/lib/api'
import { UserAvatar } from '@/components/common/user-avatar'
import { useVideoKeyboardShortcuts } from '@/hooks/use-video-keyboard-shortcuts'
import {
  Loader2,
  ArrowLeft,
  Play,
  Eye,
  Star,
  Share2,
  UserPlus,
  UserCheck,
  Sparkles,
  MessageSquare,
  Clock,
  Music,
  Check,
  ThumbsUp,
  Instagram,
  Youtube,
  Twitter,
  Globe,
  Mail,
  ExternalLink,
  AtSign,
  Lock,
  Unlock,
  ShieldCheck,
  Award,
  Trash2,
  Edit3,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FollowListModal } from '@/components/modals/follow-list-modal'
import { GENRES } from '@/config'

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

export const CATEGORY_MAP: Record<string, { emoji: string; label: string }> = {
  Education: { emoji: '🎓', label: 'Education' },
  Gaming: { emoji: '🎮', label: 'Gaming' },
  Filmmaking: { emoji: '🎬', label: 'Filmmaking' },
  Engineering: { emoji: '🔧', label: 'Engineering' },
  Technology: { emoji: '💻', label: 'Technology' },
  Art: { emoji: '🎨', label: 'Art' },
  Music: { emoji: '🎵', label: 'Music' },
  News: { emoji: '📰', label: 'News' },
  Comedy: { emoji: '😂', label: 'Comedy' },
  Other: { emoji: '🌟', label: 'Other' },
}

export function getCategoryEmoji(catName?: string | null): string {
  if (!catName) return '😂'
  return CATEGORY_MAP[catName]?.emoji || '🌟'
}

export const REVIEW_TAG_OPTIONS = [
  '✨ High Production Quality',
  '💡 Super Informative',
  '🔥 Very Engaging',
  '😂 Hilarious & Fun',
  '🎨 Truly Creative',
  '⚡ Consistent Uploads',
  '🎵 Great Audio/Music',
  '👏 Excellent Storytelling',
]

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diffSec < 60) return 'Just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}h ago`
    const diffDay = Math.floor(diffHour / 24)
    if (diffDay < 30) return `${diffDay}d ago`
    return date.toLocaleDateString()
  } catch {
    return 'Recently'
  }
}

export function CreatorProfileView() {
  const selectedCreatorId = useAppStore((s) => s.selectedCreatorId)
  const { navigate, goBack } = useAppStore()
  const user = useAppStore((s) => s.user)
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'videos' | 'reviews'>('videos')
  const [focusedVideoIndex, setFocusedVideoIndex] = useState<number>(-1)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)

  // Multi-dimensional rating form states (1-10 scale)
  const [overallRating, setOverallRating] = useState(9)
  const [contentQuality, setContentQuality] = useState(9)
  const [valueRating, setValueRating] = useState(8)
  const [creativityRating, setCreativityRating] = useState(9)
  const [entertainmentRating, setEntertainmentRating] = useState(9)
  const [consistencyRating, setConsistencyRating] = useState(8)
  const [reviewText, setReviewText] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const [followModalOpen, setFollowModalOpen] = useState(false)
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['creator-profile', selectedCreatorId, user?.id],
    queryFn: () => getCreatorProfile(selectedCreatorId!),
    enabled: !!selectedCreatorId,
  })

  // Toggle video like mutation
  const toggleLikeMutation = useMutation({
    mutationFn: (vidId: string) => toggleLike(vidId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-profile', selectedCreatorId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['my-liked-videos'] })
    },
  })

  const activeVideo =
    activeTab === 'videos' && data?.videos && focusedVideoIndex >= 0
      ? data.videos[focusedVideoIndex]
      : null

  const handleOpenVideo = (vid: { id: string }) => {
    navigate('video-detail', vid.id, {
      source: 'creator-profile',
      videoIds: data?.videos?.map((v) => v.id) || [vid.id],
    })
  }

  // Global Video Keyboard Shortcuts for Creator Profile Video Section
  useVideoKeyboardShortcuts({
    onNext: () => {
      if (!data?.videos || data.videos.length === 0) return
      setFocusedVideoIndex((prev) => (prev < data.videos.length - 1 ? prev + 1 : prev))
    },
    onPrev: () => {
      if (!data?.videos || data.videos.length === 0) return
      setFocusedVideoIndex((prev) => (prev > 0 ? prev - 1 : 0))
    },
    onTogglePlay: () => {
      if (activeVideo) {
        handleOpenVideo(activeVideo)
      } else if (data?.videos && data.videos.length > 0) {
        handleOpenVideo(data.videos[0])
      }
    },
    onToggleLike: () => {
      if (!activeVideo) return
      if (!user) {
        toast.error('Please log in to like videos')
        return
      }
      toggleLikeMutation.mutate(activeVideo.id)
    },
    enabled: activeTab === 'videos' && !ratingModalOpen && !followModalOpen && !isLoading && !!data,
  })

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: () => toggleFollowCreator(selectedCreatorId!),
    onSuccess: (result) => {
      queryClient.setQueryData(['creator-profile', selectedCreatorId, user?.id], (old: any) => {
        if (!old) return old
        return {
          ...old,
          isFollowing: result.isFollowing,
          followerCount: result.followerCount,
        }
      })
      queryClient.invalidateQueries({ queryKey: ['creator-profile', selectedCreatorId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['user-me'] })
      toast.success(result.isFollowing ? 'Following creator!' : 'Unfollowed')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Follow action failed')
    },
  })

  // Multi-dimensional Rate Mutation
  const rateMutation = useMutation({
    mutationFn: (payload: {
      overallRating: number
      contentQuality: number
      valueRating: number
      creativityRating: number
      entertainmentRating: number
      consistencyRating: number
      review?: string
      tags?: string[]
    }) => {
      return rateCreator(selectedCreatorId!, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-profile', selectedCreatorId] })
      setRatingModalOpen(false)
      toast.success('Rating and review submitted successfully!')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Rating submission failed')
    },
  })

  // Delete Rating Mutation
  const deleteRateMutation = useMutation({
    mutationFn: () => deleteCreatorRating(selectedCreatorId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-profile', selectedCreatorId] })
      toast.success('Rating deleted successfully')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete rating')
    },
  })

  const openRatingModal = () => {
    if (!user) {
      toast.error('Please log in to rate and review this creator')
      navigate('login')
      return
    }
    if (data?.userId === user.id) {
      toast.error('You cannot rate your own creator profile')
      return
    }
    if (!data?.ratingEligibility?.eligible && !data?.userRating) {
      toast.error(data?.ratingEligibility?.reason || 'You are not yet eligible to rate this creator.')
      return
    }

    const existing = data?.ratingEligibility?.userRating
    if (existing) {
      setOverallRating(existing.overallRating || 8)
      setContentQuality(existing.contentQuality || 8)
      setValueRating(existing.valueRating || 8)
      setCreativityRating(existing.creativityRating || 8)
      setEntertainmentRating(existing.entertainmentRating || 8)
      setConsistencyRating(existing.consistencyRating || 8)
      setReviewText(existing.review || '')
      setSelectedTags(existing.tags || [])
    } else {
      setOverallRating(9)
      setContentQuality(9)
      setValueRating(8)
      setCreativityRating(9)
      setEntertainmentRating(9)
      setConsistencyRating(8)
      setReviewText('')
      setSelectedTags([])
    }
    setRatingModalOpen(true)
  }

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: data?.creatorName || 'Creator Profile',
          text: `Check out @${data?.creatorName} on VidFlow`,
          url: window.location.href,
        })
        .catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Profile link copied to clipboard!')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-[#FE2C55] animate-spin" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-sm flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <button
            onClick={() => navigate('feed')}
            className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold text-white text-base">Creator Profile</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-gray-400 font-medium mb-4">Creator not found</p>
          <button
            onClick={() => navigate('feed')}
            className="px-6 py-2.5 rounded-full bg-[#FE2C55] text-white font-semibold hover:bg-[#FE2C55]/90 transition-colors"
          >
            Back to Feed
          </button>
        </div>
      </div>
    )
  }

  const initial = data.displayName?.[0]?.toUpperCase() || data.creatorName?.[0]?.toUpperCase() || '?'
  const isOwnProfile = user?.id === data.userId
  const totalReviews = data.totalRatings || data.reviews.length
  const breakdown = data.ratingBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  const eligibility = data.ratingEligibility
  const isEligible = eligibility?.eligible || !!data.userRating

  return (
    <div className="h-full w-full overflow-y-auto bg-black text-white pb-28 select-none scrollbar-thin scrollbar-thumb-zinc-800 scroll-smooth">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button
          onClick={() => (goBack ? goBack() : navigate('feed'))}
          className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-1 font-bold text-base text-white truncate max-w-[200px]">
          <span>@{data.creatorName}</span>
        </div>

        <button
          onClick={handleShare}
          className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
          aria-label="Share profile"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-2">
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Avatar with Gradient Ring */}
          <div className="relative shrink-0">
            <UserAvatar
              src={data.avatarUrl}
              name={data.displayName}
              size="2xl"
              bordered
            />
          </div>

          {/* User Info & Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                {data.displayName || data.creatorName}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-md bg-white/15 text-white/90 font-semibold uppercase tracking-wider">
                Creator
              </span>
            </div>

            {/* Unique Username Tag */}
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-300">
                <AtSign className="w-3 h-3 text-[#FE2C55]" />
                {data.username || data.creatorName}
              </span>
            </div>

            {/* Stats Row: posts, followers, following */}
            <div className="flex items-center gap-4 sm:gap-6 text-sm select-none">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1">
                <span className="font-bold text-white text-base">{data.postCount}</span>
                <span className="text-gray-400 text-xs sm:text-sm">posts</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFollowModalTab('followers')
                  setFollowModalOpen(true)
                }}
                className="flex flex-col sm:flex-row sm:items-center sm:gap-1 group cursor-pointer hover:opacity-80 transition-opacity"
              >
                <span className="font-bold text-white text-base group-hover:text-[#FE2C55] transition-colors">{formatNumber(data.followerCount)}</span>
                <span className="text-gray-400 text-xs sm:text-sm">followers</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFollowModalTab('following')
                  setFollowModalOpen(true)
                }}
                className="flex flex-col sm:flex-row sm:items-center sm:gap-1 group cursor-pointer hover:opacity-80 transition-opacity"
              >
                <span className="font-bold text-white text-base group-hover:text-[#FE2C55] transition-colors">{formatNumber(data.followingCount)}</span>
                <span className="text-gray-400 text-xs sm:text-sm">following</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bio & Niche Category */}
        <div className="mt-4 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold text-[#25F4EE] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Digital creator
            </p>
            {data.category && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-xs font-bold text-purple-300 shadow-sm">
                <span>{getCategoryEmoji(data.category)}</span>
                <span>{data.category}</span>
              </span>
            )}
          </div>

          {data.bio ? (
            <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed pt-1">
              {data.bio}
            </p>
          ) : (
            <p className="text-xs text-gray-500 italic pt-1">No bio provided yet.</p>
          )}

          {/* Social Links & Gmail Pill Row */}
          {(data.instagram || data.youtube || data.twitter || data.website || data.contactEmail) && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {data.instagram && (
                <a
                  href={`https://instagram.com/${data.instagram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-900/40 to-pink-900/40 hover:from-purple-900/60 hover:to-pink-900/60 border border-pink-500/20 text-xs font-semibold text-pink-300 transition-all hover:scale-105"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>@{data.instagram.replace(/^@/, '')}</span>
                </a>
              )}

              {data.youtube && (
                <a
                  href={data.youtube.startsWith('http') ? data.youtube : `https://youtube.com/${data.youtube.startsWith('@') ? data.youtube : `@${data.youtube}`}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/20 text-xs font-semibold text-red-300 transition-all hover:scale-105"
                >
                  <Youtube className="w-3.5 h-3.5" />
                  <span>YouTube</span>
                </a>
              )}

              {data.twitter && (
                <a
                  href={`https://x.com/${data.twitter.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/40 hover:bg-sky-900/50 border border-sky-500/20 text-xs font-semibold text-sky-300 transition-all hover:scale-105"
                >
                  <Twitter className="w-3.5 h-3.5" />
                  <span>@{data.twitter.replace(/^@/, '')}</span>
                </a>
              )}

              {data.website && (
                <a
                  href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all hover:scale-105"
                >
                  <Globe className="w-3.5 h-3.5 text-teal-400" />
                  <span className="truncate max-w-[150px]">
                    {data.website.replace(/^https?:\/\//, '')}
                  </span>
                  <ExternalLink className="w-3 h-3 text-gray-500" />
                </a>
              )}

              {data.contactEmail && (
                <a
                  href={`mailto:${data.contactEmail}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/20 text-xs font-semibold text-amber-300 transition-all hover:scale-105"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>{data.contactEmail}</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center gap-2.5 mt-5">
          {!isOwnProfile ? (
            <>
              {/* Follow / Following Primary Button */}
              <button
                onClick={() => {
                  if (!user) {
                    toast.error('Please log in to follow creators')
                    navigate('login')
                    return
                  }
                  followMutation.mutate()
                }}
                disabled={followMutation.isPending}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                  data.isFollowing
                    ? 'bg-white/15 hover:bg-white/20 text-white border border-white/20'
                    : 'bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white'
                }`}
              >
                {data.isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </button>

              {/* Rate Creator Button (Qualified System) */}
              <button
                onClick={openRatingModal}
                className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2 border shadow-lg group ${
                  isEligible
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-white/10'
                    : 'bg-zinc-900/80 text-gray-400 border-white/5 hover:border-amber-500/30'
                }`}
              >
                {isEligible ? (
                  <>
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 group-hover:scale-110 transition-transform" />
                    {data.userRating ? `Rated ${data.userRating}/10` : 'Rate Creator'}
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Rate (Locked)</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('profile')}
              className="flex-1 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20"
            >
              Edit Profile
            </button>
          )}

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-11 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center border border-white/10 transition-all shadow-lg"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs: Videos vs Ratings & Reviews */}
      <div className="max-w-2xl mx-auto mt-4">
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'videos'
                ? 'border-[#FE2C55] text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Play className="w-4 h-4" />
            Videos ({data.postCount})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'reviews'
                ? 'border-[#FE2C55] text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            Ratings & Reviews ({totalReviews})
          </button>
        </div>

        {/* Tab 1: Videos Grid */}
        {activeTab === 'videos' && (
          <div className="p-3">
            {data.videos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data.videos.map((video, idx) => {
                  const gradient = GENRE_GRADIENTS[video.genre] || GENRE_GRADIENTS.OTHER
                  const genreLabel = GENRES.includes(video.genre as (typeof GENRES)[number])
                    ? video.genre.replace('_', ' ')
                    : video.genre
                  const isFocused = idx === focusedVideoIndex
                  return (
                    <motion.div
                      key={video.id}
                      onClick={() => handleOpenVideo(video)}
                      whileHover={{ scale: 1.02 }}
                      className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-zinc-900 border aspect-[9/16] transition-all flex flex-col justify-end ${
                        isFocused
                          ? 'border-[#25F4EE] ring-2 ring-[#25F4EE] shadow-[0_0_20px_rgba(37,244,238,0.4)] scale-[1.02]'
                          : 'border-white/10 shadow-md hover:shadow-2xl hover:border-white/30'
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-b ${gradient}`} />
                      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                        isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/20">
                          <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                        </div>
                      </div>

                      <div className="absolute top-2.5 left-2.5 z-10">
                        <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                          {video.ageRating}
                        </span>
                      </div>

                      <div className="relative p-3 bg-gradient-to-t from-black via-black/70 to-transparent z-10">
                        <p className="font-bold text-xs text-white leading-tight line-clamp-2 mb-1 group-hover:text-[#25F4EE] transition-colors">
                          {video.title}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Music className="w-2.5 h-2.5 text-[#FE2C55]" />
                            {genreLabel}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-white">
                            <Eye className="w-2.5 h-2.5" />
                            {video.viewCount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Play className="h-12 w-12 text-zinc-700 mb-3" />
                <p className="text-gray-400 font-medium">No videos published yet</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Ratings & Reviews with Qualified Eligibility States */}
        {activeTab === 'reviews' && (
          <div className="p-4 space-y-6">
            {/* Qualified Rating Eligibility Status Banner */}
            {!isOwnProfile && (
              <>
                {/* State 1 & 2: Not Eligible / Almost Eligible (Locked) */}
                {!isEligible && (
                  <div className="rounded-2xl bg-zinc-900/90 border border-amber-500/20 p-5 shadow-xl">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Lock className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">Rating Locked</h4>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                            {eligibility?.qualifyingVideos ?? 0}/{eligibility?.requiredVideos ?? 3} Qualified Videos
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                          {eligibility?.reason || "Watch at least 3 videos from this creator (with 50%+ watch completion) to unlock the rating feature."}
                        </p>
                        {/* Progress Indicator */}
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400 font-medium">
                            <span>Watch Requirement Progress</span>
                            <span>{Math.round(((eligibility?.qualifyingVideos ?? 0) / Math.max(1, eligibility?.requiredVideos ?? 3)) * 100)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#FE2C55] transition-all duration-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round(
                                    ((eligibility?.qualifyingVideos ?? 0) /
                                      Math.max(1, eligibility?.requiredVideos ?? 3)) *
                                      100
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('videos')}
                          className="mt-3 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Watch Videos
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* State 3: Eligible (Unlocked & Ready to Rate) */}
                {isEligible && !data.userRating && (
                  <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/30 p-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <Unlock className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span>Rating Unlocked</span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              Eligible
                            </span>
                          </h4>
                          <p className="text-xs text-gray-300">
                            You have watched enough of this creator&apos;s content to leave a rating.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={openRatingModal}
                        className="px-5 py-2.5 rounded-xl bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white font-bold text-xs shadow-lg transition-transform hover:scale-105 shrink-0"
                      >
                        Rate Creator
                      </button>
                    </div>
                  </div>
                )}

                {/* State 4: Already Rated */}
                {data.userRating && (
                  <div className="rounded-2xl bg-zinc-900/90 border border-yellow-500/30 p-5 shadow-xl">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center shrink-0">
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>Your Rating</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-black">
                              {data.userRating}/10 ★
                            </span>
                          </h4>
                          {data.userReview && (
                            <p className="text-xs text-gray-300 mt-1 italic">&ldquo;{data.userReview}&rdquo;</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openRatingModal}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete your review?')) {
                              deleteRateMutation.mutate()
                            }
                          }}
                          disabled={deleteRateMutation.isPending}
                          className="p-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 text-red-400 hover:text-red-300 text-xs transition-colors"
                          title="Delete Rating"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Creator Rating Overview & Bayesian Trust Indicator */}
            <div className="rounded-2xl bg-zinc-900/90 border border-white/10 p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Creator Score</h3>
                  {data.isLimitedData ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold">
                      Limited Data
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified Rating
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Big Score Block */}
                <div className="flex flex-col items-center justify-center text-center shrink-0 w-full sm:w-36 py-2 border-b sm:border-b-0 sm:border-r border-white/10">
                  <span className="text-5xl font-black text-white tracking-tight">
                    {data.averageRating > 0 ? data.averageRating.toFixed(1) : '0.0'}
                  </span>
                  <div className="flex items-center gap-1 my-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(data.averageRating / 2)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-zinc-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400 font-medium">
                    {totalReviews} {totalReviews === 1 ? 'rating' : 'ratings'}
                  </span>
                </div>

                {/* 5-Star Breakdown */}
                <div className="flex-1 w-full space-y-1.5">
                  {[5, 4, 3, 2, 1].map((starKey) => {
                    const count = breakdown[starKey as 1 | 2 | 3 | 4 | 5] || 0
                    const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
                    return (
                      <div key={starKey} className="flex items-center gap-2 text-xs">
                        <span className="w-3 font-semibold text-gray-400">{starKey}</span>
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />
                        <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-yellow-400 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-medium text-gray-400 text-[11px]">
                          {pct}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Sub-dimension Averages (if available) */}
              {data.dimensionAverages && (
                <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-white/5">
                    <p className="text-[11px] text-gray-400 font-medium">🎬 Content Quality</p>
                    <p className="text-sm font-bold text-white mt-0.5">{data.dimensionAverages.contentQuality || 8.0}/10</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-white/5">
                    <p className="text-[11px] text-gray-400 font-medium">💡 Knowledge / Value</p>
                    <p className="text-sm font-bold text-white mt-0.5">{data.dimensionAverages.valueRating || 8.0}/10</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-white/5">
                    <p className="text-[11px] text-gray-400 font-medium">🎨 Creativity</p>
                    <p className="text-sm font-bold text-white mt-0.5">{data.dimensionAverages.creativityRating || 8.0}/10</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-white/5">
                    <p className="text-[11px] text-gray-400 font-medium">🎉 Entertainment</p>
                    <p className="text-sm font-bold text-white mt-0.5">{data.dimensionAverages.entertainmentRating || 8.0}/10</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-white/5">
                    <p className="text-[11px] text-gray-400 font-medium">⚡ Consistency</p>
                    <p className="text-sm font-bold text-white mt-0.5">{data.dimensionAverages.consistencyRating || 8.0}/10</p>
                  </div>
                </div>
              )}
            </div>

            {/* Individual Reviews List */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-300">User Reviews ({data.reviews?.length || 0})</h4>
              {data.reviews && data.reviews.length > 0 ? (
                data.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          src={(rev.user as any).avatarUrl}
                          name={rev.user.displayName}
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-bold text-white leading-tight">
                            {rev.user.displayName}
                          </p>
                          <span className="text-[10px] text-gray-500">
                            {formatTimeAgo(rev.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Review Score Badge */}
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-bold">
                        <Star className="w-3 h-3 fill-yellow-400" />
                        <span>{rev.overallRating || (rev.rating ? rev.rating * 2 : 10)}/10</span>
                      </div>
                    </div>

                    {/* Feedback Tags */}
                    {rev.tags && rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {rev.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-medium text-gray-300 border border-white/5"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Review text */}
                    {rev.review && (
                      <p className="text-xs text-gray-300 leading-relaxed pt-1">
                        {rev.review}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 text-center rounded-2xl bg-zinc-900/30 border border-dashed border-white/10">
                  <Star className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 font-medium">No reviews written yet</p>
                  <p className="text-xs text-gray-600 mt-1">Be the first qualified viewer to rate this creator!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Multi-Dimensional Rating & Review Dialog */}
      <Dialog open={ratingModalOpen} onOpenChange={setRatingModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/15 text-white max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              Rate @{data.creatorName}
            </DialogTitle>
            <p className="text-center text-xs text-gray-400">
              Provide authentic feedback across core creator dimensions (1 - 10 scale)
            </p>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Overall Rating Slider */}
            <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Overall Rating
                </span>
                <span className="text-lg font-black text-yellow-400">{overallRating} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={overallRating}
                onChange={(e) => setOverallRating(Number(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FE2C55]"
              />
            </div>

            {/* Sub-dimensions Grid */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Detailed Dimensions (1 - 10)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Quality */}
                <div className="p-3 rounded-xl bg-zinc-900/90 border border-white/5 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-300">
                    <span>🎬 Content Quality</span>
                    <span className="text-[#25F4EE] font-bold">{contentQuality}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={contentQuality}
                    onChange={(e) => setContentQuality(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#25F4EE]"
                  />
                </div>

                {/* Value */}
                <div className="p-3 rounded-xl bg-zinc-900/90 border border-white/5 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-300">
                    <span>💡 Value / Knowledge</span>
                    <span className="text-[#25F4EE] font-bold">{valueRating}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={valueRating}
                    onChange={(e) => setValueRating(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#25F4EE]"
                  />
                </div>

                {/* Creativity */}
                <div className="p-3 rounded-xl bg-zinc-900/90 border border-white/5 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-300">
                    <span>🎨 Creativity</span>
                    <span className="text-[#25F4EE] font-bold">{creativityRating}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={creativityRating}
                    onChange={(e) => setCreativityRating(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#25F4EE]"
                  />
                </div>

                {/* Entertainment */}
                <div className="p-3 rounded-xl bg-zinc-900/90 border border-white/5 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-300">
                    <span>🎉 Entertainment</span>
                    <span className="text-[#25F4EE] font-bold">{entertainmentRating}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={entertainmentRating}
                    onChange={(e) => setEntertainmentRating(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#25F4EE]"
                  />
                </div>

                {/* Consistency */}
                <div className="p-3 rounded-xl bg-zinc-900/90 border border-white/5 space-y-1.5 sm:col-span-2">
                  <div className="flex justify-between text-xs font-semibold text-gray-300">
                    <span>⚡ Consistency</span>
                    <span className="text-[#25F4EE] font-bold">{consistencyRating}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={consistencyRating}
                    onChange={(e) => setConsistencyRating(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-[#25F4EE]"
                  />
                </div>
              </div>
            </div>

            {/* Compliment Tag Pills */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">
                Highlights & Badges (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {REVIEW_TAG_OPTIONS.map((tag) => {
                  const isSelected = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-[#FE2C55] text-white shadow-md'
                          : 'bg-zinc-900 text-gray-300 border border-white/10 hover:bg-zinc-800'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Review text */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">
                Written Feedback
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your perspective on their storytelling, consistency, and creativity..."
                rows={3}
                className="w-full rounded-xl bg-zinc-900 border border-white/10 p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FE2C55] transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={() =>
                rateMutation.mutate({
                  overallRating,
                  contentQuality,
                  valueRating,
                  creativityRating,
                  entertainmentRating,
                  consistencyRating,
                  review: reviewText.trim() || undefined,
                  tags: selectedTags,
                })
              }
              disabled={rateMutation.isPending}
              className="w-full py-3 rounded-xl bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white font-bold text-sm transition-all shadow-xl flex items-center justify-center gap-2"
            >
              {rateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Rating...
                </>
              ) : (
                'Submit Rating & Review'
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow / Following Modal */}
      {data && (
        <FollowListModal
          isOpen={followModalOpen}
          onClose={() => setFollowModalOpen(false)}
          userId={data.id}
          title={data.displayName || data.creatorName}
          initialTab={followModalTab}
        />
      )}
    </div>
  )
}