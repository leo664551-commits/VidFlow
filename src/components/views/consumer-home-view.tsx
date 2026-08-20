'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { getVideos } from '@/lib/api'
import { GENRES } from '@/config'
import { Video } from 'lucide-react'
import type { Genre } from '@/types'

type SortOption = 'latest' | 'mostViewed' | 'highestRated'

export function ConsumerHomeView() {
  const [page, setPage] = useState(1)
  const [genre, setGenre] = useState<Genre | 'ALL'>('ALL')
  const [sort, setSort] = useState<SortOption>('latest')

  const { data, isLoading } = useQuery({
    queryKey: ['videos', page, genre, sort],
    queryFn: () =>
      getVideos({
        page,
        limit: 12,
        genre: genre === 'ALL' ? undefined : genre,
        sort,
      }),
  })

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Browse Videos</h1>
        <Select value={sort} onValueChange={(v) => { setSort(v as SortOption); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest</SelectItem>
            <SelectItem value="mostViewed">Most Viewed</SelectItem>
            <SelectItem value="highestRated">Highest Rated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs
        value={genre}
        onValueChange={(v) => {
          setGenre(v as Genre | 'ALL')
          setPage(1)
        }}
        className="w-full"
      >
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
          <TabsTrigger value="ALL" className="text-xs sm:text-sm">All</TabsTrigger>
          {GENRES.map((g) => (
            <TabsTrigger key={g} value={g} className="text-xs sm:text-sm">
              {g.replace('_', ' ')}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && <VideoGridSkeleton />}

      {!isLoading && data && data.data.length > 0 && (
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

      {!isLoading && data && data.data.length === 0 && (
        <EmptyState
          icon={Video}
          title="No videos found"
          description="Try adjusting your filters or check back later."
        />
      )}
    </div>
  )
}
