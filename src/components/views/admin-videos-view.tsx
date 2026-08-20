'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PaginationControls } from '@/components/common/pagination-controls'
import { TableSkeleton } from '@/components/common/loading-skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { getAdminVideos, updateVideoStatus, adminDeleteVideo } from '@/lib/api'
import { GENRES } from '@/config'
import { useToast } from '@/hooks/use-toast'
import { Video, Trash2, Eye, EyeOff } from 'lucide-react'
import type { VideoStatus, Genre } from '@/types'

export function AdminVideosView() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VideoStatus | 'ALL'>('ALL')
  const [genreFilter, setGenreFilter] = useState<Genre | 'ALL'>('ALL')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-videos', page, search, statusFilter, genreFilter],
    queryFn: () =>
      getAdminVideos({
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        genre: genreFilter === 'ALL' ? undefined : genreFilter,
      }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VideoStatus }) =>
      updateVideoStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] })
      toast({ title: 'Status updated' })
    },
    onError: (err) => {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: adminDeleteVideo,
    onSuccess: () => {
      setDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] })
      toast({ title: 'Video deleted' })
    },
  })

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Videos</h1>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search videos..."
          className="max-w-xs"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as VideoStatus | 'ALL'); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="READY">Ready</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="UPLOADING">Uploading</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="UNPUBLISHED">Unpublished</SelectItem>
          </SelectContent>
        </Select>
        <Select value={genreFilter} onValueChange={(v) => { setGenreFilter(v as Genre | 'ALL'); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Genres</SelectItem>
            {GENRES.map((g) => (
              <SelectItem key={g} value={g}>{g.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <TableSkeleton rows={5} cols={6} />}

      {!isLoading && data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{v.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{v.creator.creatorName}</TableCell>
                    <TableCell><Badge variant="outline">{v.genre.replace('_', ' ')}</Badge></TableCell>
                    <TableCell>
                      <StatusBadge status={v.status} />
                    </TableCell>
                    <TableCell className="text-right">{v.viewCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {v.status === 'READY' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => statusMutation.mutate({ id: v.id, status: 'UNPUBLISHED' })}
                            title="Unpublish"
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        ) : v.status === 'UNPUBLISHED' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => statusMutation.mutate({ id: v.id, status: 'READY' })}
                            title="Publish"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(v.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {!isLoading && data && data.data.length === 0 && (
        <EmptyState icon={Video} title="No videos found" />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'READY' ? 'default' : status === 'FAILED' ? 'destructive' : 'secondary'
  return <Badge variant={variant}>{status}</Badge>
}