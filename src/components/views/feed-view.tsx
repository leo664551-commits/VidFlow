'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getFeedVideos, toggleLike, toggleFollowCreator, recordVideoWatch } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
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

function VideoPlaceholder({ genre, isPlaying }: { genre: string; isPlaying: boolean }) {
  const gradient = GENRE_GRADIENTS[genre] || 'from-zinc-800 via-zinc-900 to-black'
  return (
    <div className={`absolute inset-0 bg-gradient-to-b ${gradient} flex flex-col items-center justify-center select-none`}>
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
    </div>
  )
}

function ActionBar({ video }: { video: FeedVideo }) {
  const { user, setCommentPanelOpen, setSelectedVideoId, navigate } = useAppStore()
  const queryClient = useQueryClient()
  const [liked, setLiked] = useState(video.userLiked)
  const [likeCount, setLikeCount] = useState(video.likeCount)
  const [followed, setFollowed] = useState(false)

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(video.id),
    onSuccess: (data) => {
      setLiked(data.liked)
      setLikeCount(data.likeCount)
      queryClient.invalidateQueries({ queryKey: ['feed'] })
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
      setFollowed(res.isFollowing)
      toast.success(
        res.isFollowing
          ? `Following @${video.creator.creatorName}`
          : `Unfollowed @${video.creator.creatorName}`
      )
      queryClient.invalidateQueries({ queryKey: ['creator-followers', video.creator.id] })
      queryClient.invalidateQueries({ queryKey: ['creator-following', video.creator.id] })
      queryClient.invalidateQueries({ queryKey: ['creator', video.creator.id] })
      queryClient.invalidateQueries({ queryKey: ['user-me'] })
      queryClient.invalidateQueries({ queryKey: ['creator-dashboard'] })
    },
    onError: () => {
      toast.error('Failed to update follow status')
    },
  })

  const handleShare = () => {
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
          className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-[#FE2C55] to-[#25F4EE] hover:scale-105 transition-transform overflow-hidden shadow-lg"
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
        {!followed && (
          <button
            onClick={handleFollow}
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#FE2C55] text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
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
              liked ? 'fill-[#FE2C55] text-[#FE2C55] scale-110' : 'text-white group-hover:scale-110'
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
      {/* Creator Handle */}
      <button
        onClick={handleCreatorTap}
        className="text-base font-bold text-white hover:underline drop-shadow-md flex items-center gap-1.5 mb-1"
      >
        <span>@{video.creator.creatorName}</span>
      </button>

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

      {/* Genre, Rating & Sound Marquee */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-semibold text-white transition-colors">
          <Music className="h-3 w-3 text-[#25F4EE]" />
          {video.genre.replace('_', ' ')}
        </span>
        <span className="inline-flex rounded-full bg-white/15 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-gray-200">
          {video.ageRating}
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
}: {
  video: FeedVideo
  isActive: boolean
}) {
  const [muted, setMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  const watchTimeRef = useRef(0)
  const lastSyncRef = useRef(0)
  const duration = video.duration || 30

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

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="h-dvh md:h-screen w-full flex items-center justify-center snap-start snap-always py-2 md:py-4 px-2">
      {/* 9:16 Center Video Container + Floating Action Rail */}
      <div className="flex items-end justify-center w-full max-w-lg md:max-w-2xl h-full max-h-[760px] relative">
        {/* Main 9:16 Portrait Card */}
        <div
          onClick={togglePlay}
          className="relative h-full aspect-[9/16] max-w-[420px] rounded-2xl md:rounded-3xl overflow-hidden bg-zinc-950 shadow-2xl border border-white/10 cursor-pointer group flex-shrink-0"
        >
          <VideoPlaceholder genre={video.genre} isPlaying={isPlaying} />

          {/* Sound Mute/Unmute toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMuted(!muted)
            }}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-colors shadow-lg"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Play/Pause Center Indicator on toggle */}
          <AnimatePresence>
            {!isPlaying && (
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
            <ActionBar video={video} />
          </div>
        </div>

        {/* Desktop Side Action Rail (visible on md: and above) */}
        <div className="hidden md:flex flex-col justify-end ml-4 pb-2 z-20">
          <ActionBar video={video} />
        </div>
      </div>
    </div>
  )
}

export function FeedView() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => getFeedVideos({ page: pageParam as number, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return (lastPageParam as number) + 1
      }
      return undefined
    },
  })

  const videos = data?.pages.flatMap((p) => p.data) ?? []

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current
    if (!el) return
    const target = el.children[index] as HTMLElement
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
      setActiveIndex(index)
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

  // Keyboard navigation (Up/Down arrow, j/k keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        handlePrev()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev])

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
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#FE2C55]/20 border-t-[#FE2C55]" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Loading TikTok Feed</p>
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
      {/* Scrollable vertical feed */}
      <div
        ref={scrollRef}
        className="h-full w-full snap-y snap-mandatory overflow-y-scroll scroll-smooth scrollbar-none"
      >
        {videos.map((video, idx) => (
          <FeedVideoCard key={video.id} video={video} isActive={idx === activeIndex} />
        ))}
        {isFetchingNextPage && (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#FE2C55]" />
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
