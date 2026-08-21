'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  getAdminCreators,
  deleteCreator,
  updateUserStatus,
  getAdminCreatorApplications,
  reviewCreatorApplication,
} from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'
import {
  Users,
  Plus,
  Trash2,
  Ban,
  CheckCircle2,
  ArrowLeft,
  UserCheck,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { UserAvatar } from '@/components/common/user-avatar'
import { CreatorApplicationItem } from '@/types'

export function AdminCreatorsView() {
  const { navigate, goBack } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'creators' | 'applications'>('creators')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  // Active creators query
  const { data, isLoading } = useQuery({
    queryKey: ['admin-creators', page, search],
    queryFn: () => getAdminCreators({ page, limit: 10, search: search || undefined }),
    enabled: activeTab === 'creators',
  })

  // Pending applications query
  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['admin-creator-applications', 'PENDING'],
    queryFn: () => getAdminCreatorApplications({ status: 'PENDING', limit: 20 }),
    enabled: activeTab === 'applications',
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCreator,
    onSuccess: () => {
      setDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ['admin-creators'] })
      toast({ title: 'Creator deleted' })
    },
    onError: (err) => {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      })
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'ACTIVE' | 'DISABLED' }) =>
      updateUserStatus(userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-creators'] })
      toast({ title: 'Status updated' })
    },
  })

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setReviewingId(id)
    try {
      const res = await reviewCreatorApplication(id, status)
      toast({ title: res.message })
      queryClient.invalidateQueries({ queryKey: ['admin-creator-applications'] })
      queryClient.invalidateQueries({ queryKey: ['admin-creators'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
    } catch (err) {
      toast({
        title: 'Review failed',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      })
    } finally {
      setReviewingId(null)
    }
  }

  const pendingCount = appsData?.pagination?.total ?? 0

  return (
    <div className="h-full w-full overflow-y-auto bg-gray-950 pb-32 select-none scrollbar-thin scrollbar-thumb-zinc-800 scroll-smooth">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center justify-center h-14 px-4 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 sm:left-4 text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={() => goBack('admin-dashboard')}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-white">Creator Management</h1>
          <Button
            onClick={() => navigate('admin-creator-new')}
            size="sm"
            className="absolute right-2 sm:right-4 bg-amber-500 text-black hover:bg-amber-400 h-8 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Create
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 pt-4 flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('creators')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'creators'
              ? 'border-amber-400 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Creators</span>
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'applications'
              ? 'border-amber-400 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Pending Applications</span>
          {pendingCount > 0 && (
            <Badge className="bg-amber-500 text-black font-black text-[10px] px-1.5 py-0 h-4">
              {pendingCount}
            </Badge>
          )}
        </button>
      </div>

      {/* TAB 1: ACTIVE CREATORS */}
      {activeTab === 'creators' && (
        <div className="px-4 pt-4">
          <div className="max-w-sm mb-4">
            <Input
              placeholder="Search creators..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="bg-gray-900 border-gray-800 text-white placeholder-gray-500 h-9 focus-visible:ring-gray-700 focus-visible:border-gray-600"
            />
          </div>

          {isLoading && <TableSkeleton rows={5} cols={6} />}
          {!isLoading && data && data.data.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 hover:bg-transparent">
                      <TableHead className="text-gray-400">Name</TableHead>
                      <TableHead className="text-gray-400">Email</TableHead>
                      <TableHead className="text-gray-400">Creator</TableHead>
                      <TableHead className="text-gray-400">Videos</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((c) => (
                      <TableRow
                        key={c.id}
                        className="border-gray-800/50 hover:bg-gray-800/50"
                      >
                        <TableCell className="font-medium text-white flex items-center gap-2">
                          <UserAvatar
                            src={c.user.avatarUrl}
                            name={c.user.displayName}
                            size="sm"
                          />
                          <span>{c.user.displayName}</span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-400">{c.user.email}</TableCell>
                        <TableCell className="text-white">{c.creatorName}</TableCell>
                        <TableCell className="text-gray-300">{c.videoCount}</TableCell>
                        <TableCell>
                          <StatusBadge status={c.user.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8"
                              onClick={() =>
                                toggleStatusMutation.mutate({
                                  userId: c.userId,
                                  status: c.user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                                })
                              }
                            >
                              {c.user.status === 'ACTIVE' ? (
                                <Ban className="h-4 w-4" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-8 w-8"
                              onClick={() => setDeleteId(c.id)}
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
              icon={Users}
              title="No creators found"
              description="Create a new creator to get started."
            />
          )}
        </div>
      )}

      {/* TAB 2: PENDING CREATOR APPLICATIONS */}
      {activeTab === 'applications' && (
        <div className="px-4 pt-4">
          {appsLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : appsData && appsData.data.length > 0 ? (
            <div className="space-y-3">
              {appsData.data.map((app: CreatorApplicationItem) => (
                <div
                  key={app.id}
                  className="p-4 rounded-2xl bg-gray-900 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={app.user.avatarUrl}
                        name={app.user.displayName}
                        size="md"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {app.user.displayName}
                        </h4>
                        <p className="text-xs text-gray-400 font-mono">
                          {app.user.email} (@{app.user.username || 'user'})
                        </p>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs uppercase ml-2">
                        {app.category}
                      </Badge>
                    </div>

                    {app.description && (
                      <p className="text-xs text-gray-300 bg-gray-950 p-2.5 rounded-xl border border-gray-800">
                        <span className="font-bold text-gray-400 block mb-0.5">Plan:</span>
                        {app.description}
                      </p>
                    )}

                    {app.socialLink && (
                      <p className="text-xs text-cyan-400">
                        🔗 Portfolio:{' '}
                        <a
                          href={app.socialLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {app.socialLink}
                        </a>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => handleReview(app.id, 'APPROVED')}
                      disabled={reviewingId === app.id}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4"
                    >
                      {reviewingId === app.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : (
                        <Check className="w-3.5 h-3.5 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReview(app.id, 'REJECTED')}
                      disabled={reviewingId === app.id}
                      className="border-red-500/30 text-red-400 hover:bg-red-950/40 text-xs h-9 px-3"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={UserCheck}
              title="No pending applications"
              description="All creator applications have been reviewed."
            />
          )}
        </div>
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Creator</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-white">
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
  if (status === 'ACTIVE') {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs"
      >
        {status}
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="border-red-500/30 text-red-400 bg-red-500/10 text-xs"
    >
      {status}
    </Badge>
  )
}
