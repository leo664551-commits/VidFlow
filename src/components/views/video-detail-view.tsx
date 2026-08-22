'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Music,
  Loader2,
  Volume2,
  VolumeX,
  Play,
  Plus,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { getVideoDetail, toggleLike, toggleFollowCreator, recordVideoShare, recordVideoWatch } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { useVideoKeyboardShortcuts } from '@/hooks/use-video-keyboard-shortcuts'
import { GENRES } from '@/config'
import { toast } from 'sonner'

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

export function VideoDetailView() {
  const selectedVideoId = useAppStore((s) => s.selectedVideoId)
  const videoContext = useAppStore((s) => s.videoContext)
  const { navigate, goBack } = useAppStore()
  const setCommentPanelOpen = useAppStore((s) => s.setCommentPanelOpen)
  const setSelectedVideoId = useAppStore((s) => s.setSelectedVideoId)
  const setSelectedCreatorId = useAppStore((s) => s.setSelectedCreatorId)
  const user = useAppStore((s) => s.user)
  const queryClient = useQueryClient()

  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [localLiked, setLocalLiked] = useState<boolean | null>(null)
  const [localLikeCount, setLocalLikeCount] = useState<number | null>(null)

  const { data: video, isLoading } = useQuery({
    queryKey: ['video-detail', selectedVideoId, user?.id],
    queryFn: () => getVideoDetail(selectedVideoId!),
    enabled: !!selectedVideoId,
  })

  const watchTimeRef = useRef(0)
  const lastSyncRef = useRef(0)
  const duration = video?.duration || 30

  useEffect(() => {
    if (!video || !isPlaying) return

    watchTimeRef.current = 0
    lastSyncRef.current = 0

    const interval = setInterval(() => {
      watchTimeRef.current += 1
      const currentWatch = watchTimeRef.current
      if (currentWatch - lastSyncRef.current >= 4 || currentWatch >= Math.ceil(duration * 0.5)) {
        lastSyncRef.current = currentWatch
        recordVideoWatch(video.id, {
          watchDuration: currentWatch,
          videoDuration: duration,
        })
      }
    }, 1000)

    return () => {
      clearInterval(interval)
      if (watchTimeRef.current > lastSyncRef.current) {
        recordVideoWatch(video.id, {
          watchDuration: watchTimeRef.current,
          videoDuration: duration,
        })
      }
    }
  }, [video?.id, isPlaying, duration])

  const likeMutation = useMutation({
    mutationFn: toggleLike,
    onSuccess: (result) => {
      setLocalLiked(result.liked)
      setLocalLikeCount(result.likeCount)
      queryClient.invalidateQueries({ queryKey: ['video-detail', selectedVideoId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['my-liked-videos'] })
    },
  })

  const followMutation = useMutation({
    mutationFn: (creatorId: string) => toggleFollowCreator(creatorId),
    onSuccess: (res) => {
      toast.success(
        res.isFollowing
          ? `Following @${video?.creator.creatorName}`
          : `Unfollowed @${video?.creator.creatorName}`
      )
      queryClient.invalidateQueries({ queryKey: ['video-detail', selectedVideoId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['creator-profile', video?.creator.id] })
      queryClient.invalidateQueries({ queryKey: ['creator-followers', video?.creator.id] })
      queryClient.invalidateQueries({ queryKey: ['creator-following', video?.creator.id] })
      queryClient.invalidateQueries({ queryKey: ['user-me'] })
    },
    onError: () => {
      toast.error('Failed to update follow status')
    },
  })

  const togglePlay = () => {
    setIsPlaying((prev) => !prev)
  }

  const handleBack = useCallback(() => {
    goBack('feed')
  }, [goBack])

  const videoIds = videoContext?.videoIds

  const currentIndex = useMemo(() => {
    if (!videoIds || !selectedVideoId) return -1
    return videoIds.indexOf(selectedVideoId)
  }, [videoIds, selectedVideoId])

  const hasNext = useMemo(() => {
    if (!videoIds || currentIndex < 0) return false
    return currentIndex < videoIds.length - 1
  }, [videoIds, currentIndex])

  const hasPrev = useMemo(() => {
    if (!videoIds || currentIndex < 0) return false
    return currentIndex > 0
  }, [videoIds, currentIndex])

  const handleNext = useCallback(() => {
    if (videoContext?.videoIds && currentIndex >= 0) {
      if (currentIndex < videoContext.videoIds.length - 1) {
        const nextId = videoContext.videoIds[currentIndex + 1]
        setSelectedVideoId(nextId)
        return
      }
      toast.info('No more videos in this collection')
      return
    }
    handleBack()
  }, [videoContext, currentIndex, setSelectedVideoId, handleBack])

  const handlePrev = useCallback(() => {
    if (videoContext?.videoIds && currentIndex >= 0) {
      if (currentIndex > 0) {
        const prevId = videoContext.videoIds[currentIndex - 1]
        setSelectedVideoId(prevId)
        return
      }
      toast.info('At the first video in this collection')
      return
    }
    handleBack()
  }, [videoContext, currentIndex, setSelectedVideoId, handleBack])

  // Global Video Keyboard Shortcuts for Video Detail (Must execute unconditionally before early returns)
  useVideoKeyboardShortcuts({
    onToggleLike: () => {
      if (!video) return
      if (!user) {
        toast.error('Please log in to like this video')
        return
      }
      likeMutation.mutate(video.id)
    },
    onMute: () => setIsMuted(true),
    onUnmute: () => setIsMuted(false),
    onTogglePlay: togglePlay,
    onPrev: handlePrev,
    onNext: handleNext,
    enabled: !!video && !isLoading,
  })

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-[#5E70FF]" />
      </div>
    )
  }

  if (!video) return null

  const isLiked = localLiked ?? video.userLiked ?? false
  const likeCount = localLikeCount ?? video.likeCount ?? 0
  const commentCount = video.commentCount ?? 0
  const viewCount = video.viewCount ?? 0
  const isFollowing = !!video.creator.isFollowing
  const isSelf = user?.id === video.creator.id || !!video.creator.isSelf
  const gradient = GENRE_GRADIENTS[video.genre] || GENRE_GRADIENTS.OTHER
  const initial = video.creator.creatorName?.[0]?.toUpperCase() || 'C'
  const genreLabel = GENRES.includes(video.genre as (typeof GENRES)[number])
    ? video.genre.replace('_', ' ')
    : video.genre

  const canInteract = !!user

  const handleComment = () => {
    setSelectedVideoId(video.id)
    setCommentPanelOpen(true)
  }

  const handleCreatorTap = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (video.creator.id) {
      setSelectedCreatorId(video.creator.id)
      navigate('creator-profile')
    }
  }

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) {
      toast.error('Please log in to follow creators')
      navigate('login')
      return
    }
    followMutation.mutate(video.creator.id)
  }

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!video) return
    const isNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    recordVideoShare(video.id, isNativeShare ? 'NATIVE_SHARE' : 'CLIPBOARD')
    if (isNativeShare) {
      navigator.share({
        title: video.title,
        text: `Watch "${video.title}" on VidFlow`,
        url: window.location.href,
      }).catch(() => {})
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Video link copied to clipboard!')
    }
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-black overflow-hidden py-2 select-none">
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center opacity-30 blur-3xl">
        <div className={`w-[450px] h-[750px] rounded-full bg-gradient-to-tr ${gradient}`} />
      </div>

      {/* Centered TikTok 9:16 Portrait Card Container */}
      <div className="relative flex items-center justify-center h-full max-h-[92vh]">
        <div
          onClick={togglePlay}
          className="relative h-[calc(100vh-32px)] max-h-[860px] w-full max-w-[420px] aspect-[9/16] rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/10 flex items-center justify-center group cursor-pointer"
        >
          {/* Animated Video Simulated Gradient Player */}
          <div className={`absolute inset-0 bg-gradient-to-b ${gradient} flex items-center justify-center`}>
            {/* Ambient Pulse waves */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={
                  isPlaying
                    ? { scale: [1, 1.25, 1], opacity: [0.15, 0.35, 0.15] }
                    : { scale: 1, opacity: 0.1 }
                }
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-80 h-80 rounded-full bg-white/20 blur-2xl"
              />
            </div>

            {/* Play/Pause center flash indicator */}
            {!isPlaying && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="z-20 w-20 h-20 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/20"
              >
                <Play className="w-10 h-10 text-white fill-white ml-1" />
              </motion.div>
            )}
          </div>

          {/* Top Controls: Back Button & Sound */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleBack()
              }}
              aria-label="Go back"
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-white/20 transition-all flex items-center justify-center border border-white/10 shadow-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsMuted(!isMuted)
              }}
              aria-label="Toggle Sound"
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-white/20 transition-all flex items-center justify-center border border-white/10 shadow-lg"
              title={isMuted ? 'Unmute (M+M)' : 'Mute (M)'}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Bottom Info Overlay inside the 9:16 Portrait Card */}
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10 pointer-events-auto">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <button
                onClick={handleCreatorTap}
                className="text-base font-bold text-white hover:underline drop-shadow-md flex items-center gap-1.5"
              >
                @{video.creator.creatorName}
              </button>
              {isFollowing && !isSelf && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#24BBA9]/15 text-[#24BBA9] border border-[#24BBA9]/30 backdrop-blur-sm shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#24BBA9] animate-pulse" />
                  Following
                </span>
              )}
              {!isSelf && !isFollowing && (
                <button
                  onClick={handleFollow}
                  disabled={followMutation.isPending}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all drop-shadow-sm bg-[#5E70FF] hover:bg-[#4D5FE8] text-white"
                >
                  Follow
                </button>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/15 text-white/90 font-medium">
                {video.ageRating}
              </span>
            </div>

            <h2 className="text-sm font-semibold text-white/95 line-clamp-2 mb-2 drop-shadow">
              {video.title}
            </h2>

            <div className="flex items-center gap-2 text-xs text-gray-300 drop-shadow mb-2">
              <span>{video.publisher}</span>
              <span>·</span>
              <span>{video.producer}</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-white/80 font-medium">
              <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                <Music className="w-3.5 h-3.5 text-[#5E70FF]" />
                {genreLabel}
              </span>
              <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                <Eye className="w-3.5 h-3.5 text-gray-300" />
                {formatNumber(viewCount)} views
              </span>
            </div>
          </div>

          {/* Mobile Overlay Side Rail (inside card on small screens) */}
          <div className="md:hidden absolute right-3 bottom-20 z-20 flex flex-col items-center gap-4 pointer-events-auto">
            <div className="relative mb-1">
              <button onClick={handleCreatorTap} className="relative group">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#5E70FF] to-[#24BBA9] flex items-center justify-center font-bold text-white text-base border-2 border-white shadow-lg overflow-hidden">
                  {video.creator.avatarUrl ? (
                    <img
                      src={video.creator.avatarUrl}
                      alt={video.creator.displayName || video.creator.creatorName}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    initial
                  )}
                </div>
              </button>
              {!isFollowing && !isSelf && (
                <button
                  onClick={handleFollow}
                  disabled={followMutation.isPending}
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#5E70FF] flex items-center justify-center text-white shadow-md hover:scale-110 transition-transform"
                  title="Follow"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                </button>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                if (!canInteract) {
                  toast.error('Please log in to like')
                  return
                }
                likeMutation.mutate(video.id)
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                <Heart className={`w-6 h-6 ${isLiked ? 'fill-[#DF4D50] text-[#DF4D50]' : 'text-white'}`} />
              </div>
              <span className="text-[11px] font-bold text-white">{formatNumber(likeCount)}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                handleComment()
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-[11px] font-bold text-white">{formatNumber(commentCount)}</span>
            </button>

            <button onClick={handleShare} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                <Share2 className="w-6 h-6 text-white" />
              </div>
            </button>
          </div>
        </div>

        {/* Desktop Side Action Rail (Docked directly on the right of the 9:16 card) */}
        <div className="hidden md:flex flex-col items-center gap-4 absolute right-[-72px] bottom-6 z-20 pointer-events-auto">
          {/* Creator Avatar with follow badge */}
          <div className="relative mb-2">
            <button
              onClick={handleCreatorTap}
              className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-br from-[#5E70FF] to-[#24BBA9] hover:scale-105 transition-transform overflow-hidden shadow-xl"
              title={`@${video.creator.creatorName}`}
            >
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center font-bold text-white text-base overflow-hidden">
                {video.creator.avatarUrl ? (
                  <img
                    src={video.creator.avatarUrl}
                    alt={video.creator.displayName || video.creator.creatorName}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  initial
                )}
              </div>
            </button>
            {!isFollowing && !isSelf && (
              <button
                onClick={handleFollow}
                disabled={followMutation.isPending}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#5E70FF] flex items-center justify-center text-white text-xs font-bold shadow-md hover:scale-110 transition-transform"
                title="Follow"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            )}
          </div>

          {/* Heart Like Button */}
          <button
            onClick={() => {
              if (!canInteract) {
                toast.error('Please log in to like this video')
                return
              }
              likeMutation.mutate(video.id)
            }}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-12 h-12 rounded-full bg-zinc-900/90 border border-white/10 hover:bg-zinc-800 flex items-center justify-center text-white shadow-lg transition-all group-hover:scale-110">
              <Heart
                className={`w-6 h-6 transition-colors ${
                  isLiked ? 'fill-[#DF4D50] text-[#DF4D50]' : 'text-white group-hover:text-[#DF4D50]'
                }`}
              />
            </div>
            <span className="text-xs font-bold text-white drop-shadow">{formatNumber(likeCount)}</span>
          </button>

          {/* Comment Button */}
          <button onClick={handleComment} className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 rounded-full bg-zinc-900/90 border border-white/10 hover:bg-zinc-800 flex items-center justify-center text-white shadow-lg transition-all group-hover:scale-110">
              <MessageCircle className="w-6 h-6 text-white group-hover:text-[#24BBA9] transition-colors" />
            </div>
            <span className="text-xs font-bold text-white drop-shadow">{formatNumber(commentCount)}</span>
          </button>

          {/* Share Button */}
          <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 rounded-full bg-zinc-900/90 border border-white/10 hover:bg-zinc-800 flex items-center justify-center text-white shadow-lg transition-all group-hover:scale-110">
              <Share2 className="w-6 h-6 text-white group-hover:text-[#24BBA9] transition-colors" />
            </div>
            <span className="text-xs font-bold text-white drop-shadow">Share</span>
          </button>

          {/* Spinning Vinyl Record */}
          <div className="mt-2">
            <motion.div
              animate={{ rotate: isPlaying ? 360 : 0 }}
              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 rounded-full bg-zinc-950 border-4 border-zinc-800 flex items-center justify-center shadow-2xl"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#5E70FF] to-[#24BBA9] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Desktop Up/Down Navigation Floating Controls (TikTok style) */}
      <div className="hidden lg:flex flex-col gap-2.5 fixed right-8 top-1/2 -translate-y-1/2 z-30 select-none">
        <button
          onClick={handlePrev}
          disabled={!hasPrev && !!videoContext}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 backdrop-blur-md flex items-center justify-center text-white border border-white/10 transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          title="Previous video (Arrow Up)"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
        <button
          onClick={handleNext}
          disabled={!hasNext && !!videoContext}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 backdrop-blur-md flex items-center justify-center text-white border border-white/10 transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          title="Next video (Arrow Down)"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
