'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Heart, MessageCircle, Share2, Eye, Music, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { getVideoDetail, toggleLike } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { GENRES } from '@/config'

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

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function VideoDetailView() {
  const selectedVideoId = useAppStore((s) => s.selectedVideoId)
  const navigate = useAppStore((s) => s.navigate)
  const setCommentPanelOpen = useAppStore((s) => s.setCommentPanelOpen)
  const setSelectedVideoId = useAppStore((s) => s.setSelectedVideoId)
  const setSelectedCreatorId = useAppStore((s) => s.setSelectedCreatorId)
  const user = useAppStore((s) => s.user)
  const queryClient = useQueryClient()

  const [localLiked, setLocalLiked] = useState<boolean | null>(null)
  const [localLikeCount, setLocalLikeCount] = useState<number | null>(null)

  const { data: video, isLoading } = useQuery({
    queryKey: ['video-detail', selectedVideoId],
    queryFn: () => getVideoDetail(selectedVideoId!),
    enabled: !!selectedVideoId,
  })

  const likeMutation = useMutation({
    mutationFn: toggleLike,
    onSuccess: (result) => {
      setLocalLiked(result.liked)
      setLocalLikeCount(result.likeCount)
      queryClient.invalidateQueries({ queryKey: ['video-detail', selectedVideoId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  if (!video) return null

  const isLiked = localLiked ?? video.userLiked ?? false
  const likeCount = localLikeCount ?? video.likeCount ?? 0
  const commentCount = video.commentCount ?? 0
  const viewCount = video.viewCount ?? 0
  const bg = GENRE_COLORS[video.genre] || GENRE_COLORS.OTHER
  const initial = video.creator.creatorName?.[0]?.toUpperCase() || 'C'
  const genreLabel = GENRES.includes(video.genre as typeof GENRES[number])
    ? video.genre.replace('_', ' ')
    : video.genre

  const canInteract = user?.role === 'CONSUMER' || user?.role === 'CREATOR' || user?.role === 'ADMIN'

  const handleBack = () => {
    navigate('feed')
  }

  const handleComment = () => {
    setSelectedVideoId(video.id)
    setCommentPanelOpen(true)
  }

  const handleCreatorTap = () => {
    if (video.creator.id) {
      setSelectedCreatorId(video.creator.id)
      navigate('creator-profile')
    }
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      {/* Video placeholder with genre-colored gradient */}
      <div className={`absolute inset-0 ${bg} flex items-center justify-center`}>
        <div className="text-center">
          <PlayIcon className="mx-auto h-20 w-20 text-white/20" />
          <p className="mt-3 text-sm text-white/30">Video</p>
        </div>
      </div>

      {/* Back button top-left */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        onClick={handleBack}
        className="absolute top-4 left-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </motion.button>

      {/* Muted indicator top-right */}
      <div className="absolute right-3 top-12 z-10 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
        <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.5v7a4.47 4.47 0 002.5-3.5zM14 3.23v2.06a7 7 0 010 13.42v2.06A9 9 0 0014 3.23z" />
        </svg>
      </div>

      {/* Right-side action bar (same as feed) */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute right-3 bottom-24 z-10 flex flex-col items-center gap-5"
      >
        {/* Creator Avatar */}
        <button
          onClick={handleCreatorTap}
          className="relative mb-2"
          aria-label={`View ${video.creator.creatorName}'s profile`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-lg font-bold text-white border-2 border-white">
            {initial}
          </div>
          <div className="absolute -bottom-2 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-pink-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">+</span>
          </div>
        </button>

        {/* Like */}
        <button
          onClick={() => canInteract && likeMutation.mutate(video.id)}
          className="flex flex-col items-center gap-1"
          disabled={!canInteract}
        >
          <motion.div
            whileTap={{ scale: canInteract ? 1.3 : 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Heart
              className={`h-8 w-8 drop-shadow-lg transition-colors ${
                isLiked ? 'fill-red-500 text-red-500' : 'text-white'
              }`}
            />
          </motion.div>
          <span className="text-xs text-white font-medium drop-shadow">
            {formatNumber(likeCount)}
          </span>
        </button>

        {/* Comment */}
        <button onClick={handleComment} className="flex flex-col items-center gap-1">
          <MessageCircle className="h-8 w-8 text-white drop-shadow-lg" />
          <span className="text-xs text-white font-medium drop-shadow">
            {formatNumber(commentCount)}
          </span>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center gap-1">
          <Share2 className="h-7 w-7 text-white drop-shadow-lg" />
        </button>


      </motion.div>

      {/* Bottom-left info overlay (same as feed) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-20 left-3 z-10 max-w-[65%]"
      >
        <button onClick={handleCreatorTap} className="mb-1 flex items-center gap-1">
          <span className="text-base font-bold text-white drop-shadow-lg">
            @{video.creator.creatorName}
          </span>
        </button>
        <h3 className="mb-1 text-sm font-semibold text-white drop-shadow-lg line-clamp-2">
          {video.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-300 drop-shadow-lg">
          <span>{video.publisher}</span>
          <span>·</span>
          <span>{video.producer}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            <Music className="h-3 w-3" />
            {genreLabel}
          </span>
          <span className="inline-flex rounded bg-white/15 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
            {video.ageRating}
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-white/15 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
            <Eye className="h-3 w-3" />
            {formatNumber(viewCount)}
          </span>
        </div>
      </motion.div>
    </div>
  )
}
