'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/common/empty-state'
import { DetailSkeleton } from '@/components/common/loading-skeleton'
import { PaginationControls } from '@/components/common/pagination-controls'
import {
  getVideoDetail,
  getVideoComments,
  createComment,
  getVideoRating,
  createRating,
  updateRating,
  deleteRating,
} from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import {
  Play,
  Eye,
  Calendar,
  Star,
  Send,
  Loader2,
  User,
} from 'lucide-react'

export function VideoDetailView() {
  const selectedVideoId = useAppStore((s) => s.selectedVideoId)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [commentPage, setCommentPage] = useState(1)
  const [commentText, setCommentText] = useState('')
  const [hoveredStar, setHoveredStar] = useState(0)

  const { data: video, isLoading } = useQuery({
    queryKey: ['video-detail', selectedVideoId],
    queryFn: () => getVideoDetail(selectedVideoId!),
    enabled: !!selectedVideoId,
  })

  const { data: commentsData } = useQuery({
    queryKey: ['comments', selectedVideoId, commentPage],
    queryFn: () =>
      getVideoComments(selectedVideoId!, {
        page: commentPage,
        limit: 10,
      }),
    enabled: !!selectedVideoId,
  })

  const { data: ratingData } = useQuery({
    queryKey: ['rating', selectedVideoId],
    queryFn: () => getVideoRating(selectedVideoId!),
    enabled: !!selectedVideoId,
  })

  const commentMutation = useMutation({
    mutationFn: (content: string) => createComment(selectedVideoId!, content),
    onSuccess: () => {
      setCommentText('')
      queryClient.invalidateQueries({
        queryKey: ['comments', selectedVideoId],
      })
      toast({ title: 'Comment added' })
    },
    onError: (err) => {
      toast({
        title: 'Failed to add comment',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      })
    },
  })

  const ratingMutation = useMutation({
    mutationFn: (r: number) => {
      if (ratingData?.userRating) {
        return updateRating(selectedVideoId!, r)
      }
      return createRating(selectedVideoId!, r)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['rating', selectedVideoId],
      })
    },
  })

  const removeRatingMutation = useMutation({
    mutationFn: () => deleteRating(selectedVideoId!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['rating', selectedVideoId],
      })
    },
  })

  if (isLoading) return <div className="container mx-auto px-4 py-6"><DetailSkeleton /></div>
  if (!video) return <EmptyState icon={Play} title="Video not found" />

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    commentMutation.mutate(commentText.trim())
  }

  const handleRate = (r: number) => {
    if (ratingData?.userRating === r) {
      removeRatingMutation.mutate()
    } else {
      ratingMutation.mutate(r)
    }
  }

  const avgRating = ratingData?.averageRating ?? 0
  const totalRatings = ratingData?.totalRatings ?? 0
  const userRating = ratingData?.userRating ?? 0

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Player placeholder */}
          <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
            <Play className="h-16 w-16 text-muted-foreground" />
          </div>

          {/* Title & actions */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{video.title}</h1>
            <p className="text-sm text-muted-foreground">
              by {video.creator.creatorName}
            </p>
          </div>

          {/* Rating section */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleRate(s)}
                      onMouseEnter={() => setHoveredStar(s)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          s <= (hoveredStar || userRating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {avgRating.toFixed(1)}
                  </span>{' '}
                  ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {video.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {video.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleComment} className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[60px]"
                  maxLength={1000}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="shrink-0 self-end"
                  disabled={!commentText.trim() || commentMutation.isPending}
                >
                  {commentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>

              {commentsData && commentsData.data.length > 0 ? (
                <>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {commentsData.data.map((c) => (
                      <div key={c.id} className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {c.user.displayName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(c.createdAt), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <p className="text-sm mt-0.5">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <PaginationControls
                    page={commentsData.pagination.page}
                    totalPages={commentsData.pagination.totalPages}
                    onPageChange={setCommentPage}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet. Be the first!
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Video Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MetaRow label="Publisher" value={video.publisher} />
              <MetaRow label="Producer" value={video.producer} />
              <div className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground shrink-0 w-24">
                  Genre
                </span>
                <Badge variant="outline">
                  {video.genre.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground shrink-0 w-24">
                  Age Rating
                </span>
                <Badge variant="secondary">{video.ageRating}</Badge>
              </div>
              <MetaRow
                label="Views"
                value={video.viewCount.toLocaleString()}
                icon={Eye}
              />
              <MetaRow
                label="Uploaded"
                value={format(new Date(video.createdAt), 'MMM d, yyyy')}
                icon={Calendar}
              />
              <div className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground shrink-0 w-24">
                  Status
                </span>
                <StatusBadge status={video.status} />
              </div>
              {video.duration && (
                <MetaRow
                  label="Duration"
                  value={`${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}`}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MetaRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: React.ElementType
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground shrink-0 w-24">{label}</span>
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="font-medium">{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'READY'
      ? 'default'
      : status === 'FAILED'
        ? 'destructive'
        : 'secondary'
  return <Badge variant={variant}>{status}</Badge>
}
