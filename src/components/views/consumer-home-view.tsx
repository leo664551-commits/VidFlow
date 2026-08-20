'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { Heart, MessageCircle, Share2, Loader2, Music } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { getFeedVideos, toggleLike } from '@/lib/api'
import type { FeedVideo } from '@/types'
import { GENRES } from '@/config'

const AVATAR_COLORS = [
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-cyan-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-orange-500',
]

const GRADIENT_COLORS = [
  'from-gray-900 via-gray-800 to-zinc-900',
  'from-zinc-900 via-neutral-800 to-gray-900',
  'from-neutral-900 via-zinc-800 to-neutral-950',
  'from-gray-950 via-gray-800 to-zinc-900',
]

function getAvatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getGradient(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return GRADIENT_COLORS[Math.abs(hash) % GRADIENT_COLORS.length]
}

export function FeedView() {
  const { navigate, setSelectedCreatorId } = useAppStore()
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['feed'],
      queryFn: ({ pageParam }) =>
        getFeedVideos({ page: pageParam, limit: 10 }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.pagination.page < lastPage.pagination.totalPages
          ? lastPage.pagination.page + 1
          : undefined,
      staleTime: 60 * 1000,
    })

  const allVideos = data?.pages.flatMap((p) => p.data) ?? []

  const [likeOverrides, setLikeOverrides] = useState<Map<string, { liked: boolean; count: number }>>(new Map())

  const likeMutation = useMutation({
    mutationFn: toggleLike,
    onSuccess: (result, videoId) => {
      setLikeOverrides((prev) => {
        const next = new Map(prev)
        next.set(videoId, {
          liked: result.liked,
          count: result.likeCount,
        })
        return next
      })
    },
  })

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const scrollTop = el.scrollTop
    const vh = window.innerHeight
    const newIndex = Math.round(scrollTop / vh)
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex)
    }
    if (el.scrollHeight - scrollTop - vh < 300 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [activeIndex, hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const toggleLikeHandler = (videoId: string) => {
    likeMutation.mutate(videoId)
  }

  const openComments = (videoId: string) => {
    navigate('video-detail', videoId)
    setTimeout(() => {
      useAppStore.getState().setCommentPanelOpen(true)
    }, 100)
  }

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-white animate-spin" />
      </div>
    )
  }

  if (allVideos.length === 0) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center gap-3">
        <Music className="h-12 w-12 text-gray-500" />
        <p className="text-gray-400 text-center px-8">
          No videos yet. Check back soon for new content!
        </p>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-black overflow-hidden">
      <div
        ref={scrollRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        {allVideos.map((video, idx) => (
          <FeedVideoItem
            key={video.id}
            video={video}
            isActive={idx === activeIndex}
            isLiked={likeOverrides.get(video.id)?.liked ?? video.userLiked}
            likeCount={likeOverrides.get(video.id)?.count ?? video.likeCount}
            onLike={() => toggleLikeHandler(video.id)}
            onComment={() => openComments(video.id)}
            onCreatorClick={() => {
              setSelectedCreatorId(video.creator.id)
              navigate('creator-profile')
            }}
          />
        ))}
        {isFetchingNextPage && (
          <div className="h-screen w-full bg-black flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}

function FeedVideoItem({
  video,
  isActive,
  isLiked,
  likeCount,
  onLike,
  onComment,
  onCreatorClick,
}: {
  video: FeedVideo
  isActive: boolean
  isLiked: boolean
  likeCount: number
  onLike: () => void
  onComment: () => void
  onCreatorClick: () => void
}) {
  const avatarColor = getAvatarColor(video.creator.id)
  const gradient = getGradient(video.id)
  const initial = video.creator.displayName?.[0]?.toUpperCase() || 'C'
  const genreLabel = GENRES.includes(video.genre as typeof GENRES[number])
    ? video.genre.replace('_', ' ')
    : video.genre

  return (
    <div className="h-screen w-full snap-start snap-always relative">
      {/* Video placeholder with gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${gradient}`}>
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Right-side action bar */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
        {/* Creator avatar */}
        <button
          onClick={onCreatorClick}
          className="relative"
          aria-label={`View ${video.creator.displayName}'s profile`}
        >
          <div
            className={`w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-lg border-2 border-white`}
          >
            {initial}
          </div>
        </button>

        {/* Like */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onLike}
            className="flex items-center justify-center w-10 h-10"
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart
              className={`h-7 w-7 transition-colors ${
                isLiked ? 'text-red-500 fill-red-500' : 'text-white'
              }`}
            />
          </button>
          <span className="text-white text-xs font-medium">
            {likeCount > 999 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
          </span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onComment}
            className="flex items-center justify-center w-10 h-10"
            aria-label="Comments"
          >
            <MessageCircle className="h-7 w-7 text-white" />
          </button>
          <span className="text-white text-xs font-medium">
            {video.commentCount > 999
              ? `${(video.commentCount / 1000).toFixed(1)}k`
              : video.commentCount}
          </span>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center gap-1">
          <button className="flex items-center justify-center w-10 h-10" aria-label="Share">
            <Share2 className="h-6 w-6 text-white" />
          </button>
        </div>


      </div>

      {/* Bottom-left info overlay */}
      <div className="absolute bottom-20 left-4 right-20 z-10">
        <button
          onClick={onCreatorClick}
          className="text-white font-bold text-sm mb-1 hover:underline"
        >
          @{video.creator.creatorName}
        </button>
        <h2 className="text-white font-semibold text-base leading-tight line-clamp-2 mb-2">
          {video.title}
        </h2>
        <p className="text-gray-300 text-xs mb-2">
          {video.publisher} · {video.producer}
        </p>
        <span className="inline-block bg-white/15 backdrop-blur-sm text-white text-[11px] px-2.5 py-0.5 rounded-full">
          {genreLabel}
        </span>
      </div>
    </div>
  )
}
