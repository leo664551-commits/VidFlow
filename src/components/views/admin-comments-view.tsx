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
  getAdminComments,
  updateCommentStatus,
  adminDeleteComment,
} from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  MessageSquare,
  Search,
  Eye,
  EyeOff,
  Trash2,
  Video,
  User,
  Loader2,
} from 'lucide-react'
import type { Comment, CommentStatus } from '@/types'

export function AdminCommentsView() {
  const user = useAppStore((s) => s.user)
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CommentStatus | 'ALL'>('ALL')
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null)
  const [deleteDialogComment, setDeleteDialogComment] = useState<Comment | null>(null)

  // Comments Query
  const { data, isLoading } = useQuery({
    queryKey: ['admin-comments-view', user?.id, page, statusFilter],
    queryFn: () =>
      getAdminComments({
        page,
        limit: 15,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
    enabled: !!user && user.role === 'ADMIN',
  })

  // Status Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CommentStatus }) =>
      updateCommentStatus(id, status),
    onSuccess: (res) => {
      toast.success(`Comment status updated to ${res.status}`)
      if (selectedComment && selectedComment.id === res.id) {
        setSelectedComment({ ...selectedComment, status: res.status })
      }
      queryClient.invalidateQueries({ queryKey: ['admin-comments-view'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-recent-audit-logs'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Status update failed')
    },
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteComment(id),
    onSuccess: () => {
      toast.success('Comment deleted')
      setDeleteDialogComment(null)
      setSelectedComment(null)
      queryClient.invalidateQueries({ queryKey: ['admin-comments-view'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-recent-audit-logs'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Comment deletion failed')
    },
  })

  const rawComments = data?.data || []
  const filteredComments = rawComments.filter((c: any) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.content?.toLowerCase().includes(q) ||
      c.user?.displayName?.toLowerCase().includes(q) ||
      c.video?.title?.toLowerCase().includes(q)
    )
  })

  return (
    <AdminLayout>
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Comment Moderation Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              Community Safety
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Review user discussions, filter inappropriate content, and enforce community standards.
          </p>
        </div>
      </div>

      {/* 2. Filters Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search comments or author..."
              className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 h-9 text-xs focus-visible:ring-zinc-700"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as CommentStatus | 'ALL')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-36 bg-zinc-900 border-zinc-800 text-white h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="ALL" className="text-zinc-300 text-xs">All Statuses</SelectItem>
              <SelectItem value="VISIBLE" className="text-zinc-300 text-xs">Visible</SelectItem>
              <SelectItem value="HIDDEN" className="text-zinc-300 text-xs">Hidden</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Comments Data Table */}
      <Card className="bg-zinc-900/90 border-zinc-800 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
              <p className="text-xs">Loading comment records...</p>
            </div>
          ) : filteredComments.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400 text-xs font-semibold">Author</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Comment Content</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Target Video</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold text-right">Posted</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComments.map((c: any) => (
                    <TableRow
                      key={c.id}
                      className="border-zinc-800/60 hover:bg-zinc-800/40 transition-colors"
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {c.user?.displayName?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="text-xs font-bold text-white truncate max-w-[120px]">
                            {c.user?.displayName || 'User'}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 max-w-[320px]">
                        <p className="text-xs text-zinc-200 truncate" title={c.content}>
                          {c.content}
                        </p>
                      </TableCell>

                      <TableCell className="py-3 max-w-[180px]">
                        <span className="text-xs text-zinc-400 truncate flex items-center gap-1.5" title={c.video?.title}>
                          <Video className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span className="truncate">{c.video?.title || 'Video'}</span>
                        </span>
                      </TableCell>

                      <TableCell className="py-3">
                        <AdminStatusBadge status={c.status} />
                      </TableCell>

                      <TableCell className="py-3 text-right text-xs text-zinc-400 font-mono">
                        {format(new Date(c.createdAt), 'MMM d, yyyy')}
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedComment(c)}
                            className="h-7 text-xs bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white"
                          >
                            Inspect
                          </Button>

                          {c.status === 'VISIBLE' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => statusMutation.mutate({ id: c.id, status: 'HIDDEN' })}
                              className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                              title="Hide Comment"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => statusMutation.mutate({ id: c.id, status: 'VISIBLE' })}
                              className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              title="Show Comment"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteDialogComment(c)}
                            className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            title="Delete Comment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
              <MessageSquare className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-300">No comments found</p>
              <p className="text-xs text-zinc-500">Try adjusting your search criteria or status filter.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. COMMENT INSPECTOR DRAWER */}
      {selectedComment && (
        <AdminDrawer
          open={!!selectedComment}
          title="Comment Inspector"
          subtitle={`Comment ID: ${selectedComment.id}`}
          badge={<AdminStatusBadge status={selectedComment.status} />}
          onClose={() => setSelectedComment(null)}
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogComment(selectedComment)}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Comment
              </Button>

              {selectedComment.status === 'VISIBLE' ? (
                <Button
                  onClick={() => statusMutation.mutate({ id: selectedComment.id, status: 'HIDDEN' })}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                >
                  <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                  Hide from Public Feed
                </Button>
              ) : (
                <Button
                  onClick={() => statusMutation.mutate({ id: selectedComment.id, status: 'VISIBLE' })}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Make Visible
                </Button>
              )}
            </div>
          }
        >
          {/* Comment Content Box */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Comment Text
            </span>
            <p className="text-sm text-zinc-100 leading-relaxed bg-zinc-950 p-3.5 rounded-lg border border-zinc-800">
              &ldquo;{selectedComment.content}&rdquo;
            </p>
          </div>

          {/* Context Card */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Contextual Details</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Author:</span>
                <span className="text-white font-semibold">{(selectedComment as any).user?.displayName || 'User'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Target Video:</span>
                <span className="text-white font-semibold">{(selectedComment as any).video?.title || 'Video Title'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-400">Posted Timestamp:</span>
                <span className="text-zinc-300 font-mono">
                  {format(new Date(selectedComment.createdAt), 'MMMM d, yyyy HH:mm')}
                </span>
              </div>
            </div>
          </div>
        </AdminDrawer>
      )}

      {/* 5. DELETE CONFIRMATION DIALOG */}
      <AdminConfirmDialog
        open={!!deleteDialogComment}
        title="Delete Comment"
        description="Are you sure you want to permanently delete this comment from the platform?"
        confirmText="Confirm Deletion"
        cancelText="Cancel"
        requireReason={false}
        variant="danger"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteDialogComment) {
            deleteMutation.mutate(deleteDialogComment.id)
          }
        }}
        onClose={() => setDeleteDialogComment(null)}
      />
    </AdminLayout>
  )
}
