import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, Clock, Play, AtSign, Sparkles, User, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { searchVideos, getFeedVideos, searchCreators, toggleLike, type CreatorSearchResult } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { useVideoKeyboardShortcuts } from '@/hooks/use-video-keyboard-shortcuts'
import { GENRES } from '@/config'
import type { Genre, FeedVideo } from '@/types'
import { toast } from 'sonner'

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

function DiscoverCard({
  video,
  onClick,
  isFocused,
}: {
  video: FeedVideo
  onClick: () => void
  isFocused?: boolean
}) {
  const [imgError, setImgError] = useState(false)
  const gradient = GENRE_GRADIENTS[video.genre] || GENRE_GRADIENTS.OTHER
  const thumbUrl = video.thumbnailBlobName
    ? (video.thumbnailBlobName.startsWith('data:') ||
       video.thumbnailBlobName.startsWith('/') ||
       video.thumbnailBlobName.startsWith('http')
        ? video.thumbnailBlobName
        : `/uploads/videos/${video.thumbnailBlobName}`)
    : null

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`w-full aspect-[9/16] overflow-hidden rounded-2xl relative group bg-zinc-900 border transition-all duration-300 flex flex-col justify-end text-left ${
        isFocused
          ? 'border-[#24BBA9] ring-2 ring-[#24BBA9] shadow-[0_0_20px_rgba(36,187,169,0.4)] scale-[1.02]'
          : 'border-white/10 shadow-md hover:shadow-2xl hover:border-white/30'
      }`}
    >
      {/* Background Thumbnail or Gradient */}
      {thumbUrl && !imgError ? (
        <img
          src={thumbUrl}
          alt={video.title}
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-b ${gradient} group-hover:scale-105 transition-transform duration-500`} />
      )}

      {/* Play icon overlay */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 z-10 ${
        isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <div className="h-12 w-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/20">
          <Play className="h-6 w-6 text-white fill-white ml-0.5" />
        </div>
      </div>

      {/* Duration badge */}
      {video.duration && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
          <Clock className="h-3 w-3 text-white" />
          <span className="text-[11px] font-medium text-white">
            {formatDuration(video.duration)}
          </span>
        </div>
      )}

      {/* Bottom gradient overlay with info */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-8">
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
    </motion.button>
  )
}

export function DiscoverView() {
  const { navigate, setSelectedCreatorId, searchQuery, setSearchQuery, user } = useAppStore()
  const queryClient = useQueryClient()
  const [activeGenre, setActiveGenre] = useState<string | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
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

  // Search videos query
  const searchResult = useQuery({
    queryKey: ['discover-search', debouncedQuery],
    queryFn: () => searchVideos({ query: debouncedQuery, limit: 40 }),
    enabled: isSearching,
  })

  // Search creators query (matching username or name)
  const creatorsResult = useQuery({
    queryKey: ['discover-creators', debouncedQuery],
    queryFn: () => searchCreators(debouncedQuery),
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

  const creators = creatorsResult.data ?? []
  const isLoading = isSearching
    ? searchResult.isLoading && creatorsResult.isLoading
    : genreResult.isLoading

  const handleCardClick = useCallback((video: FeedVideo) => {
    navigate('video-detail', video.id, {
      source: 'discover',
      videoIds: videos.map((v) => v.id),
    })
  }, [navigate, videos])

  const handleCreatorClick = (creatorId: string) => {
    setSelectedCreatorId(creatorId)
    navigate('creator-profile')
  }

  const handleGenreClick = (genre: string) => {
    if (activeGenre === genre) {
      setActiveGenre(null)
    } else {
      setActiveGenre(genre)
      // Clear search when selecting genre
      if (searchQuery) setSearchQuery('')
    }
    setFocusedIndex(-1)
  }

  // Like active video mutation for keyboard shortcut
  const toggleLikeMutation = useMutation({
    mutationFn: (vidId: string) => toggleLike(vidId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discover-genre'] })
      queryClient.invalidateQueries({ queryKey: ['discover-search'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['my-liked-videos'] })
    },
  })

  const activeVideo = focusedIndex >= 0 ? videos[focusedIndex] : null

  // Global Video Keyboard Shortcuts for Discover / Explore
  useVideoKeyboardShortcuts({
    onNext: () => {
      if (videos.length === 0) return
      setFocusedIndex((prev) => (prev < videos.length - 1 ? prev + 1 : prev))
    },
    onPrev: () => {
      if (videos.length === 0) return
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0))
    },
    onTogglePlay: () => {
      if (activeVideo) {
        handleCardClick(activeVideo)
      } else if (videos.length > 0) {
        handleCardClick(videos[0])
      }
    },
    onToggleLike: () => {
      if (!activeVideo) return
      if (!user) {
        toast.error('Please log in to like videos')
        return
      }
      toggleLikeMutation.mutate(activeVideo.id)
    },
    enabled: videos.length > 0,
  })

  return (
    <div className="h-full w-full overflow-y-auto bg-black text-white pb-32 select-none scrollbar-thin scrollbar-thumb-zinc-800 scroll-smooth">
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
            placeholder="Search by @username, creator, or videos..."
            className="w-full rounded-full bg-white/10 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none ring-1 ring-white/10 focus:ring-[#5E70FF] focus:border-[#5E70FF] transition-all"
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
                  ? 'bg-[#5E70FF] text-white shadow-md shadow-[#5E70FF]/25'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {genre.replace('_', ' ')}
            </button>
          )
        })}
      </div>

      {/* Content area */}
      <div className="px-3 pt-2 space-y-6">
        {/* If searching and matching creators exist, show Creators Section */}
        {isSearching && creators.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#24BBA9]" />
                Matching Creators ({creators.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {creators.map((c) => {
                const initial = c.displayName?.[0]?.toUpperCase() || c.creatorName?.[0]?.toUpperCase() || 'C'
                return (
                  <motion.div
                    key={c.id}
                    onClick={() => handleCreatorClick(c.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-3.5 rounded-2xl bg-zinc-950 border border-white/10 hover:border-white/20 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-md group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-[#5E70FF] via-[#24BBA9] to-[#5E70FF] shrink-0">
                        {c.avatarUrl ? (
                          <img
                            src={c.avatarUrl}
                            alt={c.displayName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center font-bold text-white text-sm">
                            {initial}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-white truncate group-hover:text-[#5E70FF] transition-colors">
                            {c.displayName || c.creatorName}
                          </p>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#5E70FF]/15 text-[#5E70FF] border border-[#5E70FF]/30 font-medium">
                            Creator
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono truncate flex items-center gap-0.5">
                          <AtSign className="w-3 h-3 text-[#5E70FF]" />
                          {c.username || c.creatorName}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {c.followerCount} followers • {c.videoCount} videos
                        </p>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-[#5E70FF] flex items-center justify-center text-gray-400 group-hover:text-white transition-all shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Videos Area */}
        <div>
          {isSearching && videos.length > 0 && (
            <h2 className="text-sm font-bold text-white mb-3 px-1">
              Videos ({videos.length})
            </h2>
          )}

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </div>
          ) : videos.length === 0 && creators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Search className="mb-3 h-12 w-12 text-white/20" />
              <p className="text-base font-medium text-white/60">
                {isSearching ? 'No results found' : 'No videos in this genre'}
              </p>
              <p className="mt-1 text-sm text-white/30">
                {isSearching
                  ? 'Try searching by a different @username, title, or genre'
                  : 'Check back later for new content'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 pb-8">
              {videos.map((video, idx) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.4), duration: 0.3 }}
                >
                  <DiscoverCard
                    video={video}
                    isFocused={idx === focusedIndex}
                    onClick={() => handleCardClick(video)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
