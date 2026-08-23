'use client'

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import {
  Heart,
  MessageCircle,
  Share2,
  Music,
  Plus,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Star,
  Disc3,
  Play,
  Eye,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getFeedVideos, toggleLike, toggleFollowCreator, recordVideoWatch, recordVideoShare } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { useVideoKeyboardShortcuts } from '@/hooks/use-video-keyboard-shortcuts'
import type { FeedVideo } from '@/types'
import { toast } from 'sonner'

const GENRE_GRADIENTS: Record<string, string> = {
  ACTION: 'from-red-900 via-zinc-900 to-black',
  COMEDY: 'from-amber-800 via-zinc-900 to-black',
  DRAMA: 'from-purple-900 via-zinc-900 to-black',
  HORROR: 'from-stone-900 via-red-950 to-black',
  SCIENCE_FICTION: 'from-cyan-950 via-blue-950 to-black',
  DOCUMENTARY: 'from-emerald-950 via-teal-950 to-black',
  ANIMATION: 'from-pink-900 via-rose-950 to-black',
  THRILLER: 'from-orange-950 via-zinc-900 to-black',
  ROMANCE: 'from-rose-900 via-zinc-900 to-black',
  MUSIC: 'from-violet-950 via-purple-950 to-black',
  OTHER: 'from-zinc-800 via-zinc-900 to-black',
}

function VideoPlaceholder({
  genre,
  isPlaying,
  thumbnailBlobName,
  title,
}: {
  genre: string
  isPlaying: boolean
  thumbnailBlobName?: string | null
  title?: string
}) {
  const gradient = GENRE_GRADIENTS[genre] || 'from-zinc-800 via-zinc-900 to-black'
  const thumbUrl = thumbnailBlobName
    ? (thumbnailBlobName.startsWith('data:') ||
       thumbnailBlobName.startsWith('/') ||
       thumbnailBlobName.startsWith('http')
        ? thumbnailBlobName
        : `/uploads/videos/${thumbnailBlobName}`)
    : null

  return (
    <div className={`absolute inset-0 ${thumbUrl ? 'bg-black' : `bg-gradient-to-b ${gradient}`} flex flex-col items-center justify-center select-none overflow-hidden`}>
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={title || 'Video cover'}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <>
          {/* Decorative ambient pulsing ring */}
          <motion.div
            animate={{ scale: isPlaying ? [1, 1.08, 1] : 1, opacity: isPlaying ? [0.2, 0.4, 0.2] : 0.2 }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="w-44 h-44 rounded-full bg-white/10 blur-2xl absolute"
          />
          <div className="relative z-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-3 shadow-lg border border-white/20">
              <Play className="w-7 h-7 text-white fill-white ml-1 opacity-80" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-white/50">{genre.replace('_', ' ')}</span>
          </div>
        </>
      )}
    </div>
  )
}

function ActionBar({ video }: { video: FeedVideo }) {
  const { user, setCommentPanelOpen, setSelectedVideoId, navigate } = useAppStore()
  const queryClient = useQueryClient()
  const [optimisticState, setOptimisticState] = useState<{ liked: boolean; count: number } | null>(null)

  const liked = optimisticState !== null ? optimisticState.liked : video.userLiked
  const likeCount = optimisticState !== null ? optimisticState.count : video.likeCount

  const isSelf = user?.id === video.creator.id || user?.id === (video.creator as any).userId || !!video.creator.isSelf
  const isFollowing = !!video.creator.isFollowing

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(video.id),
    onSuccess: (data) => {
      setOptimisticState({ liked: data.liked, count: data.likeCount })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['creator-profile'] })
      queryClient.invalidateQueries({ queryKey: ['video-detail'] })
      queryClient.invalidateQueries({ queryKey: ['my-liked-videos'] })
    },
  })

  const handleLike = () => {
    if (!user) {
      toast.error('Please log in to like videos')
      return
    }
    likeMutation.mutate()
  }

  const handleComment = () => {
    setSelectedVideoId(video.id)
    setCommentPanelOpen(true)
  }

  const handleCreatorTap = () => {
    if (video.creator.id) {
      useAppStore.getState().setSelectedCreatorId(video.creator.id)
      navigate('creator-profile')
    }
  }

  const followMutation = useMutation({
    mutationFn: () => toggleFollowCreator(video.creator.id),
    onSuccess: (res) => {
      toast.success(
        res.isFollowing
          ? `Following @${video.creator.creatorName}`
          : `Unfollowed @${video.creator.creatorName}`
      )
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['creator-profile'] })
      queryClient.invalidateQueries({ queryKey: ['creator-followers'] })
      queryClient.invalidateQueries({ queryKey: ['creator-following'] })
      queryClient.invalidateQueries({ queryKey: ['video-detail'] })
      queryClient.invalidateQueries({ queryKey: ['user-me'] })
      queryClient.invalidateQueries({ queryKey: ['creator-dashboard'] })
    },
    onError: () => {
      toast.error('Failed to update follow status')
    },
  })

  const handleShare = () => {
    recordVideoShare(video.id, 'CLIPBOARD')
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Video link copied to clipboard!')
    } else {
      toast.success('Share link generated!')
    }
  }

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) {
      toast.error('Please log in to follow creators')
      navigate('login')
      return
    }
    followMutation.mutate()
  }

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      {/* Creator Profile Avatar + Follow Badge */}
      <div className="relative mb-1">
        <button
          onClick={handleCreatorTap}
          className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-[#5E70FF] to-[#24BBA9] hover:scale-105 transition-transform overflow-hidden shadow-lg"
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
              video.creator.displayName?.[0]?.toUpperCase() ||
              video.creator.creatorName?.[0]?.toUpperCase() ||
              '?'
            )}
          </div>
        </button>
        {!isFollowing && !isSelf && (
          <button
            onClick={handleFollow}
            disabled={followMutation.isPending}
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#5E70FF] hover:bg-[#4D5FE8] text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
            title="Follow"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        )}
      </div>

      {/* Like Button */}
      <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
        <motion.div
          whileTap={{ scale: 1.3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-colors"
        >
          <Heart
            className={`w-6 h-6 transition-all ${
              liked ? 'fill-[#DF4D50] text-[#DF4D50] scale-110' : 'text-white group-hover:scale-110'
            }`}
          />
        </motion.div>
        <span className="text-[12px] font-bold text-white drop-shadow">{likeCount}</span>
      </button>

      {/* Comment Button */}
      <button onClick={handleComment} className="flex flex-col items-center gap-1 group">
        <div className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-colors">
          <MessageCircle className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        </div>
        <span className="text-[12px] font-bold text-white drop-shadow">{video.commentCount}</span>
      </button>

      {/* Share Button */}
      <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
        <div className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-colors">
          <Share2 className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
        </div>
        <span className="text-[12px] font-bold text-white drop-shadow">Share</span>
      </button>

      {/* Spinning Music Record Vinyl Disc */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
        className="w-10 h-10 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-950 p-1 border-2 border-zinc-700 flex items-center justify-center shadow-lg mt-1"
      >
        <Disc3 className="w-6 h-6 text-gray-400" />
      </motion.div>
    </div>
  )
}

function VideoInfoOverlay({ video }: { video: FeedVideo }) {
  const handleCreatorTap = () => {
    if (video.creator.id) {
      useAppStore.getState().setSelectedCreatorId(video.creator.id)
      useAppStore.getState().navigate('creator-profile')
    }
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 pb-5 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-10 text-left pointer-events-auto">
      {/* Creator Handle + Following Indicator */}
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <button
          onClick={handleCreatorTap}
          className="text-base font-bold text-white hover:underline drop-shadow-md flex items-center gap-1.5"
        >
          <span>@{video.creator.creatorName}</span>
        </button>
        {video.creator.isFollowing && !video.creator.isSelf && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#24BBA9]/15 text-[#24BBA9] border border-[#24BBA9]/30 backdrop-blur-sm shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#24BBA9] animate-pulse" />
            Following
          </span>
        )}
      </div>

      {/* Title & Description */}
      <h3 className="text-sm font-semibold text-white/95 line-clamp-2 drop-shadow mb-1.5 leading-snug">
        {video.title} {video.description ? `— ${video.description}` : ''}
      </h3>

      {/* Publisher & Producer Meta */}
      <div className="flex items-center gap-2 text-xs text-gray-300 drop-shadow mb-2 font-medium">
        <span>{video.publisher}</span>
        <span className="text-gray-500">•</span>
        <span>{video.producer}</span>
      </div>

      {/* Genre, Rating, Views & Sound Marquee */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-semibold text-white transition-colors">
          <Music className="h-3 w-3 text-[#5E70FF]" />
          {video.genre.replace('_', ' ')}
        </span>
        <span className="inline-flex rounded-full bg-white/15 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-gray-200">
          {video.ageRating}
        </span>
        <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full text-[11px] text-gray-300 font-medium border border-white/10">
          <Eye className="w-3 h-3 text-gray-400" />
          {(video.viewCount ?? 0).toLocaleString()} views
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
          ♫ original sound - {video.creator.creatorName}
        </span>
      </div>
    </div>
  )
}

function FeedVideoCard({
  video,
  isActive,
  muted,
  onToggleMute,
  isPlaying,
  onTogglePlay,
}: {
  video: FeedVideo
  isActive: boolean
  muted: boolean
  onToggleMute: () => void
  isPlaying: boolean
  onTogglePlay: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const watchTimeRef = useRef(0)
  const lastSyncRef = useRef(0)
  const duration = video.duration || 30

  const videoUrl = video.storageBlobName
    ? video.storageBlobName.startsWith('http') || video.storageBlobName.startsWith('/')
      ? video.storageBlobName
      : `/uploads/videos/${video.storageBlobName}`
    : null

  const posterUrl = video.thumbnailBlobName
    ? video.thumbnailBlobName.startsWith('data:') ||
      video.thumbnailBlobName.startsWith('/') ||
      video.thumbnailBlobName.startsWith('http')
      ? video.thumbnailBlobName
      : `/uploads/videos/${video.thumbnailBlobName}`
    : undefined

  // Control video playback based on active and playing state
  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    if (isActive && isPlaying) {
      const playPromise = el.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Browser may block unmuted autoplay, mute and try again
          el.muted = true
          el.play().catch((err) => console.warn('Autoplay error:', err))
        })
      }
    } else {
      el.pause()
    }
  }, [isActive, isPlaying, video.id])

  // Sync mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted
    }
  }, [muted])

  // Track meaningful video consumption
  useEffect(() => {
    if (!isActive || !isPlaying) return

    const interval = setInterval(() => {
      watchTimeRef.current += 1

      // Sync to backend periodically and at the 50% completion milestone
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
  }, [isActive, isPlaying, video.id, duration])

  return (
    <div className="h-dvh md:h-screen w-full flex items-center justify-center snap-start snap-always py-2 md:py-4 px-2">
      {/* 9:16 Center Video Container + Floating Action Rail */}
      <div className="flex items-end justify-center w-full max-w-lg md:max-w-2xl h-full max-h-[760px] relative">
        {/* Main 9:16 Portrait Card */}
        <div
          onClick={onTogglePlay}
          className="relative h-full aspect-[9/16] max-w-[420px] rounded-2xl md:rounded-3xl overflow-hidden bg-zinc-950 shadow-2xl border border-white/10 cursor-pointer group flex-shrink-0"
        >
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              poster={posterUrl}
              playsInline
              loop
              muted={muted}
              className="absolute inset-0 w-full h-full object-cover select-none"
            />
          ) : (
            <VideoPlaceholder
              genre={video.genre}
              isPlaying={isActive && isPlaying}
              thumbnailBlobName={video.thumbnailBlobName}
              title={video.title}
            />
          )}

          {/* Sound Mute/Unmute toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleMute()
            }}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-colors shadow-lg"
            title={muted ? 'Unmute (M+M)' : 'Mute (M)'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Play/Pause Center Indicator on toggle */}
          <AnimatePresence>
            {isActive && !isPlaying && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center pointer-events-none z-20"
              >
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Info Overlay */}
          <VideoInfoOverlay video={video} />

          {/* Mobile Embedded Action Bar (visible on < md only) */}
          <div className="md:hidden absolute right-3 bottom-20 z-20 pointer-events-auto">
            <ActionBar key={`mobile-${video.id}`} video={video} />
          </div>
        </div>

        {/* Desktop Side Action Rail (visible on md: and above) */}
        <div className="hidden md:flex flex-col justify-end ml-4 pb-2 z-20">
          <ActionBar key={`desktop-${video.id}`} video={video} />
        </div>
      </div>
    </div>
  )
}

export function FeedView() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [globalMuted, setGlobalMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const user = useAppStore((s) => s.user)
  const queryClient = useQueryClient()

  // Generate a distinct session seed per feed session for fresh, deterministic recommendations
  const [feedSeed, setFeedSeed] = useState<string>(
    () => `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  )

  const handleRefreshFeed = useCallback(() => {
    setIsRefreshing(true)
    const newSeed = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    setFeedSeed(newSeed)
    setActiveIndex(0)
    setIsPlaying(true)
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
    setTimeout(() => setIsRefreshing(false), 500)
  }, [])



  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['feed', user?.id, feedSeed],
    queryFn: ({ pageParam }) =>
      getFeedVideos({
        page: pageParam as number,
        limit: 10,
        seed: feedSeed,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return (lastPageParam as number) + 1
      }
      return undefined
    },
  })

  // Deduplicate videos across infinite pages to guarantee 0 session duplicates
  const videos = useMemo(() => {
    if (!data?.pages) return []
    const seen = new Set<string>()
    const list: FeedVideo[] = []
    for (const page of data.pages) {
      for (const video of page.data) {
        if (!seen.has(video.id)) {
          seen.add(video.id)
          list.push(video)
        }
      }
    }
    return list
  }, [data])

  const activeVideo = videos[activeIndex]

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current
    if (!el) return
    const target = el.children[index] as HTMLElement
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
      setActiveIndex(index)
      setIsPlaying(true)
    }
  }, [])

  const handleNext = useCallback(() => {
    if (activeIndex < videos.length - 1) {
      scrollToIndex(activeIndex + 1)
    } else if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [activeIndex, videos.length, scrollToIndex, hasNextPage, isFetchingNextPage, fetchNextPage])

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      scrollToIndex(activeIndex - 1)
    }
  }, [activeIndex, scrollToIndex])

  // Like active video mutation for keyboard shortcut
  const toggleLikeMutation = useMutation({
    mutationFn: (vidId: string) => toggleLike(vidId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['my-liked-videos'] })
    },
  })

  const handleToggleLikeActive = useCallback(() => {
    if (!activeVideo) return
    if (!user) {
      toast.error('Please log in to like videos')
      return
    }
    toggleLikeMutation.mutate(activeVideo.id)
  }, [activeVideo, user, toggleLikeMutation])

  // Global Video Keyboard Shortcuts (L = Like, M = Mute, M+M = Unmute, Space = Play/Pause, Up/Down = Navigate)
  useVideoKeyboardShortcuts({
    onToggleLike: handleToggleLikeActive,
    onMute: () => setGlobalMuted(true),
    onUnmute: () => setGlobalMuted(false),
    onTogglePlay: () => setIsPlaying((p) => !p),
    onNext: handleNext,
    onPrev: handlePrev,
    enabled: videos.length > 0,
  })

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const index = Math.round(scrollTop / clientHeight)
    setActiveIndex(index)
    if (scrollHeight - scrollTop - clientHeight < 600 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el?.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  if (isLoading) {
    return (
      <div className="flex h-dvh md:h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5E70FF]/20 border-t-[#5E70FF]" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Loading Feed</p>
        </div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="flex h-dvh md:h-screen flex-col items-center justify-center gap-4 bg-black text-white p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
          <Play className="h-10 w-10 text-white/30 ml-1" />
        </div>
        <p className="text-xl font-bold">No videos available</p>
        <p className="text-sm text-gray-400 max-w-sm">Videos uploaded by creators will appear here in your For You stream.</p>
      </div>
    )
  }

  return (
    <div className="relative h-dvh md:h-screen w-full bg-black overflow-hidden flex justify-center">
      {/* Top Floating Feed Header */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-3 pb-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">

        {/* Quick Refresh Stream Button */}
        <button
          onClick={handleRefreshFeed}
          disabled={isRefreshing}
          className="absolute right-4 top-3.5 p-2 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white/80 hover:text-white transition-all shadow-md active:scale-90 pointer-events-auto cursor-pointer"
          title="Refresh stream with new recommendations"
        >
          <RotateCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#24BBA9]' : ''}`} />
        </button>
      </div>

      {/* Scrollable vertical feed */}
      <div
        ref={scrollRef}
        className="h-full w-full snap-y snap-mandatory overflow-y-scroll scroll-smooth scrollbar-none"
      >
        {videos.map((video, idx) => (
          <FeedVideoCard
            key={video.id}
            video={video}
            isActive={idx === activeIndex}
            muted={globalMuted}
            onToggleMute={() => setGlobalMuted(!globalMuted)}
            isPlaying={idx === activeIndex ? isPlaying : false}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
          />
        ))}
        {isFetchingNextPage && (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#5E70FF]" />
          </div>
        )}
      </div>

      {/* Desktop Up/Down Navigation Floating Controls (TikTok style) */}
      <div className="hidden lg:flex flex-col gap-2.5 fixed right-8 top-1/2 -translate-y-1/2 z-30 select-none">
        <button
          onClick={handlePrev}
          disabled={activeIndex === 0}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 backdrop-blur-md flex items-center justify-center text-white border border-white/10 transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          title="Previous video (Arrow Up)"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
        <button
          onClick={handleNext}
          disabled={activeIndex >= videos.length - 1 && !hasNextPage}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 backdrop-blur-md flex items-center justify-center text-white border border-white/10 transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          title="Next video (Arrow Down)"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
