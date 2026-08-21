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
import { useAppStore } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { MessageSquare, Trash2, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import type { CommentStatus } from '@/types'

export function AdminCommentsView() {
  const { navigate, goBack, user } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<CommentStatus | 'ALL'>('ALL')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-comments', user?.id, page, statusFilter],
    queryFn: () =>
      getAdminComments({
        page, limit: 10,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CommentStatus }) => updateCommentStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-comments'] }); toast({ title: 'Status updated' }) },
    onError: (err) => { toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' }) },
  })

  const deleteMutation = useMutation({
    mutationFn: adminDeleteComment,
    onSuccess: () => { setDeleteId(null); queryClient.invalidateQueries({ queryKey: ['admin-comments'] }); toast({ title: 'Comment deleted' }) },
  })

  return (
    <div className="h-full w-full overflow-y-auto bg-gray-950 pb-32 select-none scrollbar-thin scrollbar-thumb-zinc-800 scroll-smooth">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center justify-center h-14 px-4 relative">
          <Button variant="ghost" size="icon" className="absolute left-2 sm:left-4 text-gray-400 hover:text-white hover:bg-gray-800" onClick={() => goBack('admin-dashboard')} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-white">Comments</h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        <div className="mb-4">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as CommentStatus | 'ALL'); setPage(1) }}>
            <SelectTrigger className="w-36 bg-gray-900 border-gray-800 text-white h-9 focus:ring-gray-700 focus:border-gray-600"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800">
              <SelectItem value="ALL" className="text-gray-300 focus:bg-gray-800 focus:text-white">All Statuses</SelectItem>
              <SelectItem value="VISIBLE" className="text-gray-300 focus:bg-gray-800 focus:text-white">Visible</SelectItem>
              <SelectItem value="HIDDEN" className="text-gray-300 focus:bg-gray-800 focus:text-white">Hidden</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="px-4">
        {isLoading && <TableSkeleton rows={5} cols={5} />}
        {!isLoading && data && data.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">User</TableHead><TableHead className="text-gray-400">Comment</TableHead><TableHead className="text-gray-400">Status</TableHead><TableHead className="text-gray-400 text-right">Date</TableHead><TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {data.data.map((c) => (
                    <TableRow key={c.id} className="border-gray-800/50 hover:bg-gray-800/50">
                      <TableCell className="font-medium text-white">{c.user.displayName}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm text-gray-300">{c.content}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-right text-sm text-gray-500">{format(new Date(c.createdAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.status === 'VISIBLE' ? (
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8" onClick={() => statusMutation.mutate({ id: c.id, status: 'HIDDEN' })} title="Hide"><EyeOff className="h-4 w-4" /></Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8" onClick={() => statusMutation.mutate({ id: c.id, status: 'VISIBLE' })} title="Show"><Eye className="h-4 w-4" /></Button>
                          )}
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-8 w-8" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationControls page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
          </>
        )}
        {!isLoading && data && data.data.length === 0 && <EmptyState icon={MessageSquare} title="No comments found" />}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader><AlertDialogTitle className="text-white">Delete Comment</AlertDialogTitle><AlertDialogDescription className="text-gray-400">Are you sure? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-red-600 text-white hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'VISIBLE') {
    return <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">{status}</Badge>
  }
  return <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 text-xs">{status}</Badge>
}
