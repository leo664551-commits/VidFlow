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
import { getAdminCreators, deleteCreator, updateUserStatus } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'
import { Users, Plus, Pencil, Trash2, Eye, Ban, CheckCircle2 } from 'lucide-react'

export function AdminCreatorsView() {
  const navigate = useAppStore((s) => s.navigate)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-creators', page, search],
    queryFn: () =>
      getAdminCreators({
        page,
        limit: 10,
        search: search || undefined,
      }),
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

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Creators</h1>
        <Button onClick={() => navigate('admin-creator-new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Creator
        </Button>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Search creators..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {isLoading && <TableSkeleton rows={5} cols={6} />}

      {!isLoading && data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Creator Name</TableHead>
                  <TableHead>Videos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.user.displayName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.user.email}</TableCell>
                    <TableCell>{c.creatorName}</TableCell>
                    <TableCell>{c.videoCount}</TableCell>
                    <TableCell>
                      <Badge
                        variant={c.user.status === 'ACTIVE' ? 'default' : 'destructive'}
                      >
                        {c.user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              userId: c.userId,
                              status: c.user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                            })
                          }
                          title={c.user.status === 'ACTIVE' ? 'Disable' : 'Activate'}
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Creator</AlertDialogTitle>
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
