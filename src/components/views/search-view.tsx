'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { searchVideos } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { GENRES } from '@/config'
import { Search, Eye, Clock, Loader2, Play } from 'lucide-react'
import type { Genre, VideoWithCreator } from '@/types'

const CARD_COLORS = [
  'from-rose-900/60 to-gray-900',
  'from-amber-900/60 to-gray-900',
  'from-emerald-900/60 to-gray-900',
  'from-cyan-900/60 to-gray-900',
  'from-violet-900/60 to-gray-900',
  'from-pink-900/60 to-gray-900',
  'from-teal-900/60 to-gray-900',
  'from-orange-900/60 to-gray-900',
  'from-red-900/60 to-gray-900',
  'from-indigo-900/60 to-gray-900',
]

function getCardColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length]
}

export function DiscoverView() {
  const navigate = useAppStore((s) => s.navigate)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<string>('ALL')
  const [hasSearched, setHasSearched] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['discover-search', debouncedQuery, selectedGenre],
    queryFn: () =>
      searchVideos({
        query: debouncedQuery || undefined,
        genre: selectedGenre === 'ALL' ? undefined : (selectedGenre as Genre),
        page: 1,
        limit: 30,
      }),
    enabled: hasSearched,
  })

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setDebouncedQuery(query)
      setHasSearched(true)
    },
    [query]
  )

  const handleGenreSelect = (genre: string) => {
    setSelectedGenre(genre)
    setDebouncedQuery(query)
    setHasSearched(true)
  }

  const videos = data?.data ?? []

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Search bar */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-sm px-4 pt-4 pb-3">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search videos, creators..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/10 text-white placeholder-gray-400 rounded-full h-10 focus-visible:ring-white/20"
          />
        </form>
      </div>

      {/* Genre pills */}
      <div className="px-4 pb-3">
        <div
          className="flex gap-2 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          <button
            onClick={() => handleGenreSelect('ALL')}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedGenre === 'ALL'
                ? 'bg-white text-black'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            All
          </button>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => handleGenreSelect(g)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedGenre === g
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {g.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-4">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}

        {!isLoading && hasSearched && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-12 w-12 text-gray-600 mb-3" />
            <p className="text-gray-400">No videos found</p>
            <p className="text-gray-500 text-sm mt-1">
              Try different keywords or filters
            </p>
          </div>
        )}

        {!isLoading && videos.length > 0 && (
          <div className="columns-2 gap-2 space-y-2">
            {videos.map((v, i) => (
              <DiscoverCard
                key={v.id}
                video={v}
                index={i}
                onClick={() => navigate('video-detail', v.id)}
              />
            ))}
          </div>
        )}

        {!hasSearched && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-12 w-12 text-gray-600 mb-3" />
            <p className="text-gray-400">Discover new content</p>
            <p className="text-gray-500 text-sm mt-1">
              Search or pick a genre to start exploring
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function DiscoverCard({
  video,
  index,
  onClick,
}: {
  video: VideoWithCreator
  index: number
  onClick: () => void
}) {
  const gradient = getCardColor(video.id)
  const genreLabel = video.genre.replace('_', ' ')
  // Vary heights for masonry effect
  const heights = ['h-48', 'h-56', 'h-64', 'h-52', 'h-60']
  const height = heights[index % heights.length]
  const mins = video.duration
    ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}`
    : null

  return (
    <button
      onClick={onClick}
      className={`w-full ${height} rounded-lg bg-gradient-to-br ${gradient} relative overflow-hidden group break-inside-avoid mb-2`}
    >
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Play className="h-10 w-10 text-white/40 group-hover:text-white/70 transition-colors" />
      </div>
      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white text-xs font-semibold leading-tight line-clamp-2">
          {video.title}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-gray-300 text-[10px]">{video.creator.creatorName}</span>
          <div className="flex items-center gap-2 text-gray-300 text-[10px]">
            {mins && (
              <span className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {mins}
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <Eye className="h-2.5 w-2.5" />
              {video.viewCount > 999
                ? `${(video.viewCount / 1000).toFixed(1)}k`
                : video.viewCount}
            </span>
          </div>
        </div>
      </div>
      {/* Genre tag top-right */}
      <div className="absolute top-2 right-2">
        <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded">
          {genreLabel}
        </span>
      </div>
    </button>
  )
}
