'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import { getCreatorProfile } from '@/lib/api'
import { Loader2, ArrowLeft, Play, Eye } from 'lucide-react'

const GRADIENTS = [
  'bg-gradient-to-br from-rose-500 to-pink-600',
  'bg-gradient-to-br from-amber-500 to-orange-600',
  'bg-gradient-to-br from-emerald-500 to-teal-600',
  'bg-gradient-to-br from-cyan-500 to-sky-600',
  'bg-gradient-to-br from-violet-500 to-purple-600',
  'bg-gradient-to-br from-fuchsia-500 to-pink-600',
]

const GENRE_COLORS: Record<string, string> = {
  ACTION: 'from-red-900/60 to-gray-900',
  COMEDY: 'from-yellow-900/60 to-gray-900',
  DRAMA: 'from-rose-900/60 to-gray-900',
  HORROR: 'from-gray-800/80 to-gray-900',
  SCIENCE_FICTION: 'from-cyan-900/60 to-gray-900',
  DOCUMENTARY: 'from-emerald-900/60 to-gray-900',
  ANIMATION: 'from-pink-900/60 to-gray-900',
  THRILLER: 'from-orange-900/60 to-gray-900',
  ROMANCE: 'from-fuchsia-900/60 to-gray-900',
  MUSIC: 'from-violet-900/60 to-gray-900',
  OTHER: 'from-gray-800/60 to-gray-900',
}

function getGradient(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function CreatorProfileView() {
  const selectedCreatorId = useAppStore((s) => s.selectedCreatorId)
  const navigate = useAppStore((s) => s.navigate)
  const setSelectedVideoId = useAppStore((s) => s.setSelectedVideoId)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['creator-profile', selectedCreatorId],
    queryFn: () => getCreatorProfile(selectedCreatorId!),
    enabled: !!selectedCreatorId,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-sm flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('feed')}
            className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-white font-semibold text-sm">Profile</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <p className="text-gray-400 text-sm">Creator not found</p>
        </div>
      </div>
    )
  }

  const gradient = getGradient(data.id)
  const initial = data.displayName?.[0]?.toUpperCase() || 'C'

  const handleVideoClick = (videoId: string) => {
    setSelectedVideoId(videoId)
    navigate('video-detail', videoId)
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-sm flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate('feed')}
          className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-white font-semibold text-sm">Profile</span>
      </div>

      {/* Avatar + info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center px-4 pt-4 pb-6"
      >
        <div
          className={`w-24 h-24 rounded-full ${gradient} flex items-center justify-center text-white text-4xl font-bold mb-3`}
        >
          {initial}
        </div>
        <h1 className="text-white text-xl font-bold">@{data.creatorName}</h1>
        <p className="text-gray-400 text-sm mt-0.5">{data.displayName}</p>
        {data.description && (
          <p className="text-gray-300 text-sm mt-3 text-center max-w-sm">
            {data.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-10 mt-5">
          <div className="text-center">
            <p className="text-white text-lg font-bold">{data.videoCount}</p>
            <p className="text-gray-500 text-xs">Videos</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-white text-lg font-bold">
              {formatViews(data.totalViews)}
            </p>
            <p className="text-gray-500 text-xs">Views</p>
          </div>
        </div>
      </motion.div>

      {/* Video grid */}
      {data.videos.length > 0 ? (
        <div className="grid grid-cols-3 gap-0.5">
          {data.videos.map((v, i) => {
            const genreColor = GENRE_COLORS[v.genre] || GENRE_COLORS.OTHER
            return (
              <motion.button
                key={v.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                onClick={() => handleVideoClick(v.id)}
                className={`aspect-[3/4] bg-gradient-to-br ${genreColor} relative overflow-hidden group`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-8 w-8 text-white/30 group-hover:text-white/60 transition-colors" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-[10px] font-medium leading-tight line-clamp-2">
                    {v.title}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5 text-gray-300 text-[9px]">
                    <Eye className="h-2.5 w-2.5" />
                    {formatViews(v.viewCount)}
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center px-8">
          <Play className="h-12 w-12 text-gray-600 mb-3" />
          <p className="text-gray-400">No videos yet</p>
        </div>
      )}
    </div>
  )
}
