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
import { Video, Pencil, Trash2, Upload } from 'lucide-react'
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
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">My Videos</h1>
        <Button onClick={() => navigate('creator-upload')}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Video
        </Button>
      </div>

      <Select
        value={status}
        onValueChange={(v) => {
          setStatus(v as VideoStatus | 'ALL')
          setPage(1)
        }}
      >
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

      {isLoading && <TableSkeleton rows={5} cols={5} />}

      {!isLoading && data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {v.title}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={v.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {v.viewCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(v.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate('creator-edit-video', v.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
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
  const variant =
    status === 'READY'
      ? 'default'
      : status === 'FAILED'
        ? 'destructive'
        : 'secondary'
  return <Badge variant={variant}>{status}</Badge>
}
