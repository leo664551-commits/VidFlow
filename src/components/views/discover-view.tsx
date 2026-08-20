'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Eye, Clock, Play } from 'lucide-react'
import { motion } from 'framer-motion'
import { searchVideos, getFeedVideos } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { GENRES } from '@/config'
import type { Genre, FeedVideo } from '@/types'

const GENRE_GRADIENTS: Record<string, string> = {
  ACTION: 'from-red-600 to-red-900',
  COMEDY: 'from-yellow-500 to-amber-800',
  DRAMA: 'from-purple-600 to-purple-900',
  HORROR: 'from-gray-600 to-gray-900',
  SCIENCE_FICTION: 'from-cyan-600 to-teal-900',
  DOCUMENTARY: 'from-emerald-600 to-emerald-900',
  ANIMATION: 'from-pink-500 to-rose-800',
  THRILLER: 'from-orange-600 to-orange-900',
  ROMANCE: 'from-rose-500 to-rose-800',
  MUSIC: 'from-violet-500 to-violet-900',
  OTHER: 'from-gray-500 to-gray-800',
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatViews(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return String(count)
}

function DiscoverCard({ video, onClick }: { video: FeedVideo; onClick: () => void }) {
  const gradient = GENRE_GRADIENTS[video.genre] || GENRE_GRADIENTS.OTHER
  // Vary card height for masonry effect based on video id
  const heights = ['h-48', 'h-56', 'h-64', 'h-52', 'h-60']
  const heightIdx = video.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % heights.length

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="mb-3 w-full break-inside-avoid overflow-hidden rounded-xl relative group"
    >
      {/* Gradient background */}
      <div className={`${heights[heightIdx]} w-full bg-gradient-to-br ${gradient} relative`}>
        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="h-14 w-14 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Play className="h-7 w-7 text-white fill-white" />
          </div>
        </div>

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
            <Clock className="h-3 w-3 text-white" />
            <span className="text-[11px] font-medium text-white">
              {formatDuration(video.duration)}
            </span>
          </div>
        )}

        {/* Bottom gradient overlay with info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-8">
          <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2 mb-1.5">
            {video.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatViews(video.viewCount)}
            </span>
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              {video.genre.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  )
}

export function DiscoverView() {
  const { navigate, searchQuery, setSearchQuery } = useAppStore()
  const [activeGenre, setActiveGenre] = useState<string | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pillScrollRef = useRef<HTMLDivElement>(null)

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  // When user types in search, clear genre filter
  const isSearching = debouncedQuery.trim().length > 0

  // Search query
  const searchResult = useQuery({
    queryKey: ['discover-search', debouncedQuery],
    queryFn: () => searchVideos({ query: debouncedQuery, limit: 40 }),
    enabled: isSearching,
  })

  // Genre feed query
  const genreResult = useQuery({
    queryKey: ['discover-genre', activeGenre],
    queryFn: () => getFeedVideos({ genre: activeGenre || undefined, limit: 40 }),
    enabled: !isSearching,
  })

  // Determine which data to show
  const videos = useMemo(() => {
    if (isSearching) {
      return (searchResult.data?.data ?? []) as unknown as FeedVideo[]
    }
    return genreResult.data?.data ?? []
  }, [isSearching, searchResult.data, genreResult.data])

  const isLoading = isSearching ? searchResult.isLoading : genreResult.isLoading

  const handleCardClick = (video: FeedVideo) => {
    navigate('video-detail', video.id)
  }

  const handleGenreClick = (genre: string) => {
    if (activeGenre === genre) {
      setActiveGenre(null)
    } else {
      setActiveGenre(genre)
      // Clear search when selecting genre
      if (searchQuery) setSearchQuery('')
    }
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Search bar */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (e.target.value) setActiveGenre(null)
            }}
            placeholder="Search videos, creators..."
            className="w-full rounded-full bg-white/10 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none ring-1 ring-white/10 focus:ring-white/30 transition-all"
          />
        </div>
      </div>

      {/* Genre pills */}
      <div
        ref={pillScrollRef}
        className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {GENRES.map((genre) => {
          const isActive = activeGenre === genre
          return (
            <button
              key={genre}
              onClick={() => handleGenreClick(genre)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {genre.replace('_', ' ')}
            </button>
          )
        })}
      </div>

      {/* Content area */}
      <div className="px-2 pt-2">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Search className="mb-3 h-12 w-12 text-white/20" />
            <p className="text-base font-medium text-white/60">
              {isSearching ? 'No results found' : 'No videos in this genre'}
            </p>
            <p className="mt-1 text-sm text-white/30">
              {isSearching
                ? 'Try a different search term'
                : 'Check back later for new content'}
            </p>
          </div>
        ) : (
          <div className="columns-2 gap-3">
            {videos.map((video, idx) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.4), duration: 0.3 }}
              >
                <DiscoverCard video={video} onClick={() => handleCardClick(video)} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
