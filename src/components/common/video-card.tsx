'use client'

import { Play, Eye, Music, Clock } from 'lucide-react'
import { format } from 'date-fns'
import type { VideoWithCreator } from '@/types'
import { useAppStore, type VideoContext } from '@/store/app-store'
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

interface VideoCardProps {
  video: VideoWithCreator
  context?: VideoContext
}

export function VideoCard({ video, context }: VideoCardProps) {
  const navigate = useAppStore((s) => s.navigate)
  const gradient = GENRE_GRADIENTS[video.genre] || GENRE_GRADIENTS.OTHER
  const genreLabel = GENRES.includes(video.genre as (typeof GENRES)[number])
    ? video.genre.replace('_', ' ')
    : video.genre

  return (
    <div
      onClick={() => navigate('video-detail', video.id, context)}
      className="group relative cursor-pointer overflow-hidden rounded-2xl bg-zinc-900 border border-white/10 aspect-[9/16] shadow-md hover:shadow-2xl hover:border-white/30 transition-all duration-300 flex flex-col justify-end"
    >
      {/* Background Poster / Gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${gradient} group-hover:scale-105 transition-transform duration-500`}
      />

      {/* Hover Center Play Button */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
        <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/20">
          <Play className="w-6 h-6 text-white fill-white ml-0.5" />
        </div>
      </div>

      {/* Top Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
        <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
          {video.ageRating}
        </span>
        {video.duration && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-medium text-white border border-white/10">
            <Clock className="w-2.5 h-2.5" />
            {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Bottom Info Overlay */}
      <div className="relative p-3.5 bg-gradient-to-t from-black via-black/70 to-transparent z-10">
        <h3 className="font-bold text-sm text-white leading-tight line-clamp-2 mb-1 group-hover:text-[#25F4EE] transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center gap-1.5 mb-2">
          <p className="text-xs text-gray-300 font-medium truncate">
            @{video.creator.creatorName}
          </p>
          {(video.creator as any).isFollowing && !(video.creator as any).isSelf && (
            <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-semibold bg-[#25F4EE]/15 text-[#25F4EE] border border-[#25F4EE]/30 rounded-full">
              <span className="w-1 h-1 rounded-full bg-[#25F4EE]" />
              Following
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <Music className="w-3 h-3 text-[#FE2C55]" />
            {genreLabel}
          </span>
          <span className="flex items-center gap-1 font-semibold text-white">
            <Eye className="w-3 h-3 text-gray-400" />
            {(video.viewCount ?? 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
