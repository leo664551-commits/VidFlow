'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
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
import { getCreatorVideos, deleteVideo } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { Video, Pencil, Trash2, Upload, ArrowLeft } from 'lucide-react'
import type { VideoStatus } from '@/types'

export function CreatorVideosView() {
  const navigate = useAppStore((s) => s.navigate)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<VideoStatus | 'ALL'>('ALL')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['creator-videos', page, status],
    queryFn: () =>
      getCreatorVideos({
        page,
        limit: 10,
        status: status === 'ALL' ? undefined : status,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => {
      setDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ['creator-videos'] })
      toast({ title: 'Video deleted' })
    },
    onError: (err) => {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      })
    },
  })

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center px-4 h-12">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:text-white hover:bg-white/10 -ml-2"
            onClick={() => navigate('feed')}
            aria-label="Back to feed"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 text-center text-lg font-semibold text-white -ml-12">
            My Videos
          </h1>
          <Button
            onClick={() => navigate('creator-upload')}
            size="sm"
            className="bg-white text-gray-950 hover:bg-gray-200 font-medium h-8"
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            Upload
          </Button>
        </div>
      </header>

      <div className="px-4 pt-4">
        {/* Status Filter */}
        <div className="mb-4">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as VideoStatus | 'ALL')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-48 bg-gray-900 border-white/10 text-white h-9">
              <SelectValue placeholder="Filter by status" />
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
        </div>

        {isLoading && <TableSkeleton rows={5} cols={5} />}

        {!isLoading && data && data.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-gray-400 text-xs uppercase tracking-wider">
                      Title
                    </TableHead>
                    <TableHead className="text-gray-400 text-xs uppercase tracking-wider">
                      Status
                    </TableHead>
                    <TableHead className="text-gray-400 text-xs uppercase tracking-wider text-right">
                      Views
                    </TableHead>
                    <TableHead className="text-gray-400 text-xs uppercase tracking-wider text-right">
                      Date
                    </TableHead>
                    <TableHead className="text-gray-400 text-xs uppercase tracking-wider text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((v) => (
                    <TableRow
                      key={v.id}
                      className="border-white/5 hover:bg-white/5"
                    >
                      <TableCell className="font-medium text-white max-w-[200px] truncate">
                        {v.title}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={v.status} />
                      </TableCell>
                      <TableCell className="text-right text-gray-300">
                        {v.viewCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-500">
                        {format(new Date(v.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8"
                            onClick={() => navigate('creator-edit-video', v.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-8 w-8"
                            onClick={() => setDeleteId(v.id)}
                          >
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
          <EmptyState
            icon={Video}
            title="No videos found"
            description="Upload your first video to get started."
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent className="bg-gray-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete Video
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this video? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-gray-400 border-white/10 hover:bg-white/5 hover:text-gray-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-600 text-white hover:bg-red-700"
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
  const className =
    status === 'READY'
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25'
      : status === 'FAILED'
        ? 'bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25'
        : status === 'PROCESSING'
          ? 'bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/25'
          : 'bg-white/10 text-gray-400 border-white/5 hover:bg-white/15'

  const variant =
    status === 'READY'
      ? 'default'
      : status === 'FAILED'
        ? 'destructive'
        : 'secondary'

  return (
    <Badge variant={variant} className={`text-xs font-medium ${className}`}>
      {status}
    </Badge>
  )
}
