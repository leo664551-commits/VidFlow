'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import { AdminStatusBadge } from '@/components/admin/ui/admin-status-badge'
import { AdminPagination } from '@/components/admin/ui/admin-pagination'
import { AdminDrawer } from '@/components/admin/ui/admin-drawer'
import { AdminConfirmDialog } from '@/components/admin/ui/admin-confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getAdminVideos,
  updateVideoStatus,
  adminDeleteVideo,
} from '@/lib/api'
import { GENRES } from '@/config'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Video,
  Search,
  Eye,
  EyeOff,
  Trash2,
  Play,
  Clock,
  Heart,
  MessageSquare,
  Sparkles,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import type { VideoWithCreator, VideoStatus, Genre } from '@/types'

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

export function AdminVideosView() {
  const { navigate, user, setSelectedVideoId } = useAppStore()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VideoStatus | 'ALL'>('ALL')
  const [genreFilter, setGenreFilter] = useState<Genre | 'ALL'>('ALL')
  const [selectedVideo, setSelectedVideo] = useState<VideoWithCreator | null>(null)
  const [deleteDialogVideo, setDeleteDialogVideo] = useState<VideoWithCreator | null>(null)

  // Videos Query
  const { data, isLoading } = useQuery({
    queryKey: ['admin-videos-view', user?.id, page, search, statusFilter, genreFilter],
    queryFn: () =>
      getAdminVideos({
        page,
        limit: 15,
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        genre: genreFilter === 'ALL' ? undefined : genreFilter,
      }),
    enabled: !!user && user.role === 'ADMIN',
  })

  // Status Change Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VideoStatus }) =>
      updateVideoStatus(id, status),
    onSuccess: (res) => {
      toast.success(`Video status changed to ${res.status}`)
      if (selectedVideo && selectedVideo.id === res.id) {
        setSelectedVideo({ ...selectedVideo, status: res.status })
      }
      queryClient.invalidateQueries({ queryKey: ['admin-videos-view'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-recent-audit-logs'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Status update failed')
    },
  })

  // Delete Video Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteVideo(id),
    onSuccess: () => {
      toast.success('Video permanently removed from platform')
      setDeleteDialogVideo(null)
      setSelectedVideo(null)
      queryClient.invalidateQueries({ queryKey: ['admin-videos-view'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-recent-audit-logs'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Video deletion failed')
    },
  })

  const videos = data?.data || []

  return (
    <AdminLayout>
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Content Moderation & Catalog</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#5E70FF]/15 text-[#5E70FF] border border-[#5E70FF]/30">
              Media Asset Center
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Global catalog of videos with playable preview inspection, status management, and policy enforcement.
          </p>
        </div>
      </div>

      {/* 2. Filters Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search title, creator, publisher..."
              className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 h-9 text-xs focus-visible:ring-zinc-700"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as VideoStatus | 'ALL')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-36 bg-zinc-900 border-zinc-800 text-white h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="ALL" className="text-zinc-300 text-xs">All Statuses</SelectItem>
              <SelectItem value="READY" className="text-zinc-300 text-xs">Ready (Published)</SelectItem>
              <SelectItem value="UNPUBLISHED" className="text-zinc-300 text-xs">Unpublished</SelectItem>
              <SelectItem value="PROCESSING" className="text-zinc-300 text-xs">Processing</SelectItem>
              <SelectItem value="UPLOADING" className="text-zinc-300 text-xs">Uploading</SelectItem>
              <SelectItem value="FAILED" className="text-zinc-300 text-xs">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={genreFilter}
            onValueChange={(v) => {
              setGenreFilter(v as Genre | 'ALL')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-36 bg-zinc-900 border-zinc-800 text-white h-9 text-xs">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="ALL" className="text-zinc-300 text-xs">All Genres</SelectItem>
              {GENRES.map((g) => (
                <SelectItem key={g} value={g} className="text-zinc-300 text-xs">
                  {g.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Videos High-Density Data Grid */}
      <Card className="bg-zinc-900/90 border-zinc-800 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-8 h-8 text-[#5E70FF] animate-spin" />
              <p className="text-xs">Loading video catalog...</p>
            </div>
          ) : videos.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400 text-xs font-semibold">Video Preview</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Creator</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Genre & Age</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold text-right">Views</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold text-right">Engagement</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map((v) => {
                    const gradient = GENRE_GRADIENTS[v.genre] || GENRE_GRADIENTS.OTHER
                    return (
                      <TableRow
                        key={v.id}
                        className="border-zinc-800/60 hover:bg-zinc-800/40 transition-colors"
                      >
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => setSelectedVideo(v)}
                              className={`w-10 h-14 rounded-lg bg-gradient-to-b ${gradient} border border-white/10 shrink-0 flex items-center justify-center relative cursor-pointer group shadow`}
                            >
                              <Play className="w-3.5 h-3.5 text-white fill-white group-hover:scale-125 transition-transform" />
                            </div>
                            <div className="min-w-0 max-w-[200px]">
                              <p className="text-xs font-bold text-white truncate" title={v.title}>
                                {v.title}
                              </p>
                              <p className="text-[11px] text-zinc-400 truncate">
                                {v.publisher || 'Studio'} • {v.producer || 'Producer'}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-2.5">
                          <span className="text-xs font-semibold text-zinc-200">
                            @{v.creator?.creatorName || 'creator'}
                          </span>
                        </TableCell>

                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {v.genre.replace('_', ' ')}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-800/60 text-zinc-400">
                              {v.ageRating}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-2.5">
                          <AdminStatusBadge status={v.status} />
                        </TableCell>

                        <TableCell className="py-2.5 text-right font-mono text-xs font-semibold text-zinc-300">
                          {(v.viewCount ?? 0).toLocaleString()}
                        </TableCell>

                        <TableCell className="py-2.5 text-right">
                          <div className="inline-flex items-center gap-2.5 text-[11px] text-zinc-400">
                            <span className="flex items-center gap-0.5">
                              <Heart className="w-3 h-3 text-[#DF4D50]" />
                              {(v as any).likeCount ?? 0}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <MessageSquare className="w-3 h-3 text-[#24BBA9]" />
                              {(v as any).commentCount ?? 0}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedVideo(v)}
                              className="h-7 text-xs bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white"
                            >
                              Review
                            </Button>

                            {v.status === 'READY' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => statusMutation.mutate({ id: v.id, status: 'UNPUBLISHED' })}
                                className="h-7 px-2 text-xs text-[#FF8D28] hover:text-[#FF8D28]/80 hover:bg-[#FF8D28]/10"
                                title="Unpublish / Hide Video"
                              >
                                <EyeOff className="w-3.5 h-3.5" />
                              </Button>
                            ) : v.status === 'UNPUBLISHED' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => statusMutation.mutate({ id: v.id, status: 'READY' })}
                                className="h-7 px-2 text-xs text-[#48B321] hover:text-[#48B321]/80 hover:bg-[#48B321]/10"
                                title="Publish Video"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            ) : null}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteDialogVideo(v)}
                              className="h-7 px-2 text-xs text-[#DF4D50] hover:text-[#DF4D50]/80 hover:bg-[#DF4D50]/10"
                              title="Delete Video"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {data?.pagination && (
                <div className="p-3 border-t border-zinc-800">
                  <AdminPagination
                    page={data.pagination.page}
                    totalPages={data.pagination.totalPages}
                    totalItems={data.pagination.total}
                    limit={data.pagination.limit}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center text-zinc-500 space-y-2">
              <Video className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-300">No videos found</p>
              <p className="text-xs text-zinc-500">Try adjusting your genre or status filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. VIDEO INSPECTION & PLAYBACK REVIEW DRAWER */}
      {selectedVideo && (
        <AdminDrawer
          open={!!selectedVideo}
          title={selectedVideo.title}
          subtitle={`Video Asset ID: ${selectedVideo.id}`}
          badge={<AdminStatusBadge status={selectedVideo.status} />}
          onClose={() => setSelectedVideo(null)}
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogVideo(selectedVideo)}
                className="bg-[#DF4D50]/10 hover:bg-[#DF4D50]/20 text-[#DF4D50] border-[#DF4D50]/30 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Video
              </Button>

              <div className="flex items-center gap-2">
                {selectedVideo.status === 'READY' ? (
                  <Button
                    onClick={() => statusMutation.mutate({ id: selectedVideo.id, status: 'UNPUBLISHED' })}
                    disabled={statusMutation.isPending}
                    className="bg-[#FF8D28] hover:bg-[#FF8D28]/90 text-black font-bold text-xs"
                  >
                    <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                    Unpublish Content
                  </Button>
                ) : (
                  <Button
                    onClick={() => statusMutation.mutate({ id: selectedVideo.id, status: 'READY' })}
                    disabled={statusMutation.isPending}
                    className="bg-[#48B321] hover:bg-[#48B321]/90 text-white font-bold text-xs"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Approve & Publish
                  </Button>
                )}
              </div>
            </div>
          }
        >
          {/* Simulated 9:16 Video Player Workspace */}
          <div className="relative aspect-[9/16] max-h-[380px] mx-auto rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col justify-end p-4">
            <div
              className={`absolute inset-0 bg-gradient-to-b ${
                GENRE_GRADIENTS[selectedVideo.genre] || GENRE_GRADIENTS.OTHER
              }`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </div>
            </div>

            <div className="relative z-10 space-y-1">
              <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-bold text-[#5E70FF] border border-[#5E70FF]/30">
                {selectedVideo.genre}
              </span>
              <h3 className="text-sm font-bold text-white leading-tight">{selectedVideo.title}</h3>
              <p className="text-xs text-zinc-300">@{selectedVideo.creator?.creatorName}</p>
            </div>
          </div>

          {/* Metadata Card */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Content Metadata</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-zinc-500">Publisher:</span>
                <p className="text-zinc-200 font-semibold">{selectedVideo.publisher}</p>
              </div>
              <div>
                <span className="text-zinc-500">Producer:</span>
                <p className="text-zinc-200 font-semibold">{selectedVideo.producer}</p>
              </div>
              <div>
                <span className="text-zinc-500">Age Rating:</span>
                <p className="text-zinc-200 font-semibold">{selectedVideo.ageRating}</p>
              </div>
              <div>
                <span className="text-zinc-500">Uploaded On:</span>
                <p className="text-zinc-200 font-semibold">
                  {format(new Date(selectedVideo.createdAt), 'MMMM d, yyyy HH:mm')}
                </p>
              </div>
            </div>

            {selectedVideo.description && (
              <div className="pt-2 border-t border-zinc-800">
                <span className="text-zinc-500 text-xs">Description:</span>
                <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed bg-zinc-950 p-2.5 rounded border border-zinc-800">
                  {selectedVideo.description}
                </p>
              </div>
            )}
          </div>
        </AdminDrawer>
      )}

      {/* 5. DELETE CONFIRMATION DIALOG */}
      <AdminConfirmDialog
        open={!!deleteDialogVideo}
        title="Permanently Delete Video Asset"
        description={`Are you sure you want to permanently delete "${deleteDialogVideo?.title}"? This action cannot be undone.`}
        confirmText="Confirm Deletion"
        cancelText="Cancel"
        requireReason={true}
        reasonLabel="Reason for Video Removal"
        variant="danger"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteDialogVideo) {
            deleteMutation.mutate(deleteDialogVideo.id)
          }
        }}
        onClose={() => setDeleteDialogVideo(null)}
      />
    </AdminLayout>
  )
}
