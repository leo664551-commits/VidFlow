'use client'

import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Video } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { getLatestVideos } from '@/lib/api'
import { VideoCard } from '@/components/common/video-card'
import { VideoGridSkeleton } from '@/components/common/loading-skeleton'
import { EmptyState } from '@/components/common/empty-state'

export function LandingView() {
  const navigate = useAppStore((s) => s.navigate)

  const { data: videos, isLoading } = useQuery({
    queryKey: ['latest-videos'],
    queryFn: () => getLatestVideos(8),
  })

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative bg-muted/50 py-20 md:py-32">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <Video className="h-16 w-16 mx-auto mb-6 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            StreamVault
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8">
            Discover, watch, and share videos from creators around the world.
            Your next favorite video is waiting.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate('register')}>
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('login')}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Latest Videos */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6">Latest Videos</h2>
        {isLoading && <VideoGridSkeleton />}
        {!isLoading && videos && videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        )}
        {!isLoading && videos && videos.length === 0 && (
          <EmptyState
            icon={Video}
            title="No videos yet"
            description="Check back soon for new content from our creators."
          />
        )}
      </section>
    </div>
  )
}
