'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { Heart, MessageCircle, Share2, Star, Music } from 'lucide-react'
import { motion } from 'framer-motion'
import { getFeedVideos, toggleLike } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import type { FeedVideo } from '@/types'

const GENRE_COLORS: Record<string, string> = {
  ACTION: 'bg-red-500/80',
  COMEDY: 'bg-yellow-500/80',
  DRAMA: 'bg-purple-500/80',
  HORROR: 'bg-gray-600/80',
  SCIENCE_FICTION: 'bg-cyan-500/80',
  DOCUMENTARY: 'bg-emerald-500/80',
  ANIMATION: 'bg-pink-500/80',
  THRILLER: 'bg-orange-500/80',
  ROMANCE: 'bg-rose-500/80',
  MUSIC: 'bg-violet-500/80',
  OTHER: 'bg-gray-500/80',
}

function VideoPlaceholder({ genre }: { genre: string }) {
  const bg = GENRE_COLORS[genre] || 'bg-gray-700'
  return (
    <div className={`absolute inset-0 ${bg} flex items-center justify-center`}>
      <div className="text-center">
        <PlayIcon className="mx-auto h-16 w-16 text-white/30" />
        <p className="mt-2 text-sm text-white/40">Video</p>
      </div>
    </div>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function ActionBar({ video }: { video: FeedVideo }) {
  const { user, setCommentPanelOpen, setSelectedVideoId, navigate } = useAppStore()
  const queryClient = useQueryClient()
  const [liked, setLiked] = useState(video.userLiked)
  const [likeCount, setLikeCount] = useState(video.likeCount)

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(video.id),
    onSuccess: (data) => {
      setLiked(data.liked)
      setLikeCount(data.likeCount)
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  const canInteract = user?.role === 'CONSUMER' || user?.role === 'ADMIN'

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

  return (
    <div className="absolute right-3 bottom-24 z-10 flex flex-col items-center gap-5">
      <button onClick={handleCreatorTap} className="relative mb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-lg font-bold text-white">
          {video.creator.creatorName?.[0]?.toUpperCase() || '?'}
        </div>
      </button>

      <button
        onClick={() => canInteract && likeMutation.mutate()}
        className="flex flex-col items-center gap-1"
        disabled={!canInteract}
      >
        <motion.div
          whileTap={{ scale: canInteract ? 1.3 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Heart
            className={`h-8 w-8 drop-shadow-lg transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`}
          />
        </motion.div>
        <span className="text-xs font-medium text-white drop-shadow">{likeCount}</span>
      </button>

      <button onClick={handleComment} className="flex flex-col items-center gap-1">
        <MessageCircle className="h-8 w-8 text-white drop-shadow-lg" />
        <span className="text-xs font-medium text-white drop-shadow">{video.commentCount}</span>
      </button>

      <button className="flex flex-col items-center gap-1">
        <Share2 className="h-7 w-7 text-white drop-shadow-lg" />
      </button>

      {video.avgRating > 0 && (
        <div className="flex flex-col items-center gap-1">
          <Star className="h-7 w-7 fill-yellow-400 text-yellow-400 drop-shadow-lg" />
          <span className="text-xs font-medium text-white drop-shadow">{video.avgRating.toFixed(1)}</span>
        </div>
      )}
    </div>
  )
}

function VideoInfo({ video }: { video: FeedVideo }) {
  const handleCreatorTap = () => {
    if (video.creator.id) {
      useAppStore.getState().setSelectedCreatorId(video.creator.id)
      useAppStore.getState().navigate('creator-profile')
    }
  }

  return (
    <div className="absolute bottom-20 left-3 z-10 max-w-[65%]">
      <button onClick={handleCreatorTap} className="mb-1 flex items-center gap-1">
        <span className="text-base font-bold text-white drop-shadow-lg">
          @{video.creator.creatorName}
        </span>
      </button>
      <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-white drop-shadow-lg">
        {video.title}
      </h3>
      <div className="flex items-center gap-2 text-xs text-gray-300 drop-shadow-lg">
        <span>{video.publisher}</span>
        <span>·</span>
        <span>{video.producer}</span>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          <Music className="h-3 w-3" />
          {video.genre.replace('_', ' ')}
        </span>
        <span className="inline-flex rounded bg-white/15 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
          {video.ageRating}
        </span>
      </div>
    </div>
  )
}

function FeedVideoItem({ video }: { video: FeedVideo }) {
  return (
    <div className="relative h-dvh w-full snap-start snap-always flex-shrink-0">
      <VideoPlaceholder genre={video.genre} />
      <VideoInfo video={video} />
      <ActionBar video={video} />
      <div className="absolute right-3 top-12 z-10 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
        <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.5v7a4.47 4.47 0 002.5-3.5zM14 3.23v2.06a7 7 0 010 13.42v2.06A9 9 0 0014 3.23z" />
        </svg>
      </div>
    </div>
  )
}

export function FeedView() {
  const scrollRef = useRef<HTMLDivElement>(null)

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

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight - scrollTop - clientHeight < 500 && hasNextPage && !isFetchingNextPage) {
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
      <div className="flex h-dvh items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-black text-white">
        <PlayIcon className="h-16 w-16 text-white/20" />
        <p className="text-lg font-medium">No videos yet</p>
        <p className="text-sm text-gray-400">Check back later for new content</p>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="h-dvh w-full snap-y snap-mandatory scroll-smooth"
      style={{ overflowY: 'scroll', scrollbarWidth: 'none' }}
    >
      {videos.map((video) => (
        <FeedVideoItem key={video.id} video={video} />
      ))}
      {isFetchingNextPage && (
        <div className="flex h-32 items-center justify-center bg-black">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      )}
      <div className="h-16" />
    </div>
  )
}
