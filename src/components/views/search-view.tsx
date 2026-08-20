'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VideoCard } from '@/components/common/video-card'
import { PaginationControls } from '@/components/common/pagination-controls'
import { VideoGridSkeleton } from '@/components/common/loading-skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { searchVideos } from '@/lib/api'
import { GENRES } from '@/config'
import { Search, Video } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import type { Genre } from '@/types'

export function SearchView() {
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const [query, setQuery] = useState(searchQuery)
  const [page, setPage] = useState(1)
  const [genre, setGenre] = useState<Genre | 'ALL'>('ALL')
  const [publisher, setPublisher] = useState('')
  const [producer, setProducer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setQuery(searchQuery)
    setSubmitted(searchQuery.length > 0)
  }, [searchQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(query)
    setPage(1)
    setSubmitted(true)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['search', query, page, genre, publisher, producer],
    queryFn: () =>
      searchVideos({
        query,
        page,
        limit: 12,
        genre: genre === 'ALL' ? undefined : genre,
        publisher: publisher || undefined,
        producer: producer || undefined,
      }),
    enabled: submitted && query.length > 0,
  })

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="sr-only">Search</button>
      </form>

      <div className="flex flex-wrap gap-3">
        <Select
          value={genre}
          onValueChange={(v) => {
            setGenre(v as Genre | 'ALL')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Genres</SelectItem>
            {GENRES.map((g) => (
              <SelectItem key={g} value={g}>
                {g.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Publisher"
          className="w-40"
          value={publisher}
          onChange={(e) => {
            setPublisher(e.target.value)
            setPage(1)
          }}
        />
        <Input
          placeholder="Producer"
          className="w-40"
          value={producer}
          onChange={(e) => {
            setProducer(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {!submitted && (
        <EmptyState
          icon={Search}
          title="Search for videos"
          description="Enter a search term and optionally filter by genre, publisher, or producer."
        />
      )}

      {submitted && isLoading && <VideoGridSkeleton />}

      {submitted && !isLoading && data && data.data.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.data.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
          <PaginationControls
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {submitted && !isLoading && data && data.data.length === 0 && (
        <EmptyState
          icon={Video}
          title="No results found"
          description="Try different keywords or filters."
        />
      )}
    </div>
  )
}
