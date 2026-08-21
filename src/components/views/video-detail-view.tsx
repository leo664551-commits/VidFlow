'use client'

import { useState } from 'react'
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
  Star,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { getVideoDetail, toggleLike, rateCreator, updateCreatorRating } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { GENRES } from '@/config'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  const { navigate, goBack } = useAppStore()
  const setCommentPanelOpen = useAppStore((s) => s.setCommentPanelOpen)
  const setSelectedVideoId = useAppStore((s) => s.setSelectedVideoId)
  const setSelectedCreatorId = useAppStore((s) => s.setSelectedCreatorId)
  const user = useAppStore((s) => s.user)
  const queryClient = useQueryClient()

  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedRating, setSelectedRating] = useState(5)
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
      queryClient.invalidateQueries({ queryKey: ['my-liked-videos'] })
    },
  })

  const rateMutation = useMutation({
    mutationFn: (rating: number) => {
      if (!video?.creator?.id) return Promise.reject(new Error('Creator not found'))
      return rateCreator(video.creator.id, rating)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-detail', selectedVideoId] })
      setRatingModalOpen(false)
      toast.success('Thank you for rating this creator!')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Rating failed')
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-[#FE2C55]" />
      </div>
    )
  }

  if (!video) return null

  const isLiked = localLiked ?? video.userLiked ?? false
  const likeCount = localLikeCount ?? video.likeCount ?? 0
  const commentCount = video.commentCount ?? 0
  const viewCount = video.viewCount ?? 0
  const gradient = GENRE_GRADIENTS[video.genre] || GENRE_GRADIENTS.OTHER
  const initial = video.creator.creatorName?.[0]?.toUpperCase() || 'C'
  const genreLabel = GENRES.includes(video.genre as (typeof GENRES)[number])
    ? video.genre.replace('_', ' ')
    : video.genre

  const canInteract = !!user

  const handleBack = () => {
    goBack('feed')
  }

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

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: `Watch "${video.title}" on VidFlow`,
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Video link copied to clipboard!')
    }
  }

  const togglePlay = () => {
    setIsPlaying((prev) => !prev)
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
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Bottom Info Overlay inside the 9:16 Portrait Card */}
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10 pointer-events-auto">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={handleCreatorTap}
                className="text-base font-bold text-white hover:underline drop-shadow-md flex items-center gap-1.5"
              >
                @{video.creator.creatorName}
              </button>
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
                <Music className="w-3.5 h-3.5 text-[#25F4EE]" />
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
            <button onClick={handleCreatorTap} className="relative group">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FE2C55] to-orange-500 flex items-center justify-center font-bold text-white text-base border-2 border-white shadow-lg">
                {initial}
              </div>
            </button>

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
                <Heart className={`w-6 h-6 ${isLiked ? 'fill-[#FE2C55] text-[#FE2C55]' : 'text-white'}`} />
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
              className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-br from-[#FE2C55] to-orange-500 hover:scale-105 transition-transform overflow-hidden shadow-xl"
              title={`@${video.creator.creatorName}`}
            >
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center font-bold text-white text-base overflow-hidden">
                {(video.creator as any).avatarUrl ? (
                  <img
                    src={(video.creator as any).avatarUrl}
                    alt={(video.creator as any).displayName || video.creator.creatorName}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  initial
                )}
              </div>
            </button>
            <button
              onClick={handleCreatorTap}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#FE2C55] flex items-center justify-center text-white text-xs font-bold shadow-md hover:scale-110 transition-transform"
            >
              +
            </button>
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
                  isLiked ? 'fill-[#FE2C55] text-[#FE2C55]' : 'text-white group-hover:text-[#FE2C55]'
                }`}
              />
            </div>
            <span className="text-xs font-bold text-white drop-shadow">{formatNumber(likeCount)}</span>
          </button>

          {/* Comment Button */}
          <button onClick={handleComment} className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 rounded-full bg-zinc-900/90 border border-white/10 hover:bg-zinc-800 flex items-center justify-center text-white shadow-lg transition-all group-hover:scale-110">
              <MessageCircle className="w-6 h-6 text-white group-hover:text-[#25F4EE] transition-colors" />
            </div>
            <span className="text-xs font-bold text-white drop-shadow">{formatNumber(commentCount)}</span>
          </button>

          {/* Rate Button */}
          <button
            onClick={() => {
              if (!canInteract) {
                toast.error('Please log in to rate this creator')
                return
              }
              setRatingModalOpen(true)
            }}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-12 h-12 rounded-full bg-zinc-900/90 border border-white/10 hover:bg-zinc-800 flex items-center justify-center text-white shadow-lg transition-all group-hover:scale-110">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            </div>
            <span className="text-xs font-bold text-white drop-shadow">Rate</span>
          </button>

          {/* Share Button */}
          <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 rounded-full bg-zinc-900/90 border border-white/10 hover:bg-zinc-800 flex items-center justify-center text-white shadow-lg transition-all group-hover:scale-110">
              <Share2 className="w-6 h-6 text-white group-hover:text-[#25F4EE] transition-colors" />
            </div>
            <span className="text-xs font-bold text-white drop-shadow">Share</span>
          </button>

          {/* Spinning Vinyl Record (TikTok Trademark) */}
          <div className="mt-2">
            <motion.div
              animate={{ rotate: isPlaying ? 360 : 0 }}
              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 rounded-full bg-zinc-950 border-4 border-zinc-800 flex items-center justify-center shadow-2xl"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#FE2C55] to-[#25F4EE] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Creator Rating Dialog */}
      <Dialog open={ratingModalOpen} onOpenChange={setRatingModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/15 text-white max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">Rate @{video.creator.creatorName}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4 space-y-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setSelectedRating(star)}
                  className="p-1 hover:scale-125 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= selectedRating ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            <button
              onClick={() => rateMutation.mutate(selectedRating)}
              disabled={rateMutation.isPending}
              className="w-full py-2.5 rounded-xl bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white font-bold text-sm transition-all"
            >
              {rateMutation.isPending ? 'Submitting...' : `Submit ${selectedRating} Star Rating`}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
