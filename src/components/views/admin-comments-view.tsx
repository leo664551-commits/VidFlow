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
import { getAdminComments, updateCommentStatus, adminDeleteComment } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { MessageSquare, Trash2, Eye, EyeOff } from 'lucide-react'
import type { CommentStatus } from '@/types'

export function AdminCommentsView() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<CommentStatus | 'ALL'>('ALL')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-comments', page, statusFilter],
    queryFn: () =>
      getAdminComments({
        page,
        limit: 10,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CommentStatus }) =>
      updateCommentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-comments'] })
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
    mutationFn: adminDeleteComment,
    onSuccess: () => {
      setDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ['admin-comments'] })
      toast({ title: 'Comment deleted' })
    },
  })

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Comments</h1>

      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as CommentStatus | 'ALL'); setPage(1) }}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          <SelectItem value="VISIBLE">Visible</SelectItem>
          <SelectItem value="HIDDEN">Hidden</SelectItem>
        </SelectContent>
      </Select>

      {isLoading && <TableSkeleton rows={5} cols={5} />}

      {!isLoading && data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.user.displayName}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm">{c.content}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'VISIBLE' ? 'default' : 'secondary'}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{format(new Date(c.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === 'VISIBLE' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => statusMutation.mutate({ id: c.id, status: 'HIDDEN' })}
                            title="Hide"
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => statusMutation.mutate({ id: c.id, status: 'VISIBLE' })}
                            title="Show"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
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
        <EmptyState icon={MessageSquare} title="No comments found" />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
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
