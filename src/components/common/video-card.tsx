'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Eye } from 'lucide-react'
import { format } from 'date-fns'
import type { VideoWithCreator } from '@/types'
import { useAppStore } from '@/store/app-store'

interface VideoCardProps {
  video: VideoWithCreator
}

export function VideoCard({ video }: VideoCardProps) {
  const navigate = useAppStore((s) => s.navigate)

  return (
    <Card
      className="cursor-pointer gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md"
      onClick={() => navigate('video-detail', video.id)}
    >
      <div className="relative aspect-video w-full bg-muted flex items-center justify-center">
        <Play className="h-10 w-10 text-muted-foreground" />
        <Badge
          variant="secondary"
          className="absolute right-2 top-2 text-xs"
        >
          {video.ageRating}
        </Badge>
      </div>
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2">
          {video.title}
        </h3>
        <p className="text-xs text-muted-foreground">
          {video.creator.creatorName}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {video.genre.replace('_', ' ')}
          </Badge>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {video.viewCount.toLocaleString()}
          </span>
          <span>{format(new Date(video.createdAt), 'MMM d, yyyy')}</span>
        </div>
      </CardContent>
    </Card>
  )
}
