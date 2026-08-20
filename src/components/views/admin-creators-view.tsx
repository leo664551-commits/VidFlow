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
import { Users, Plus, Trash2, Ban, CheckCircle2, ArrowLeft } from 'lucide-react'

export function AdminCreatorsView() {
  const navigate = useAppStore((s) => s.navigate)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-creators', page, search],
    queryFn: () => getAdminCreators({ page, limit: 10, search: search || undefined }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCreator,
    onSuccess: () => { setDeleteId(null); queryClient.invalidateQueries({ queryKey: ['admin-creators'] }); toast({ title: 'Creator deleted' }) },
    onError: (err) => { toast({ title: 'Delete failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' }) },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'ACTIVE' | 'DISABLED' }) => updateUserStatus(userId, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-creators'] }); toast({ title: 'Status updated' }) },
  })

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center justify-center h-14 px-4 relative">
          <Button variant="ghost" size="icon" className="absolute left-2 sm:left-4 text-gray-400 hover:text-white hover:bg-gray-800" onClick={() => navigate('feed')} aria-label="Back to feed">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-white">Creators</h1>
          <Button onClick={() => navigate('admin-creator-new')} size="sm" className="absolute right-2 sm:right-4 bg-amber-500 text-black hover:bg-amber-400 h-8 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5 mr-1" />Create
          </Button>
        </div>
      </header>

      <div className="px-4 pt-4">
        <div className="max-w-sm mb-4">
          <Input placeholder="Search creators..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="bg-gray-900 border-gray-800 text-white placeholder-gray-500 h-9 focus-visible:ring-gray-700 focus-visible:border-gray-600" />
        </div>
      </div>

      <div className="px-4">
        {isLoading && <TableSkeleton rows={5} cols={6} />}
        {!isLoading && data && data.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Name</TableHead><TableHead className="text-gray-400">Email</TableHead><TableHead className="text-gray-400">Creator</TableHead><TableHead className="text-gray-400">Videos</TableHead><TableHead className="text-gray-400">Status</TableHead><TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {data.data.map((c) => (
                    <TableRow key={c.id} className="border-gray-800/50 hover:bg-gray-800/50">
                      <TableCell className="font-medium text-white">{c.user.displayName}</TableCell>
                      <TableCell className="text-sm text-gray-400">{c.user.email}</TableCell>
                      <TableCell className="text-white">{c.creatorName}</TableCell>
                      <TableCell className="text-gray-300">{c.videoCount}</TableCell>
                      <TableCell><StatusBadge status={c.user.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8" onClick={() => toggleStatusMutation.mutate({ userId: c.userId, status: c.user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' })}>
                            {c.user.status === 'ACTIVE' ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          </Button>
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
        {!isLoading && data && data.data.length === 0 && <EmptyState icon={Users} title="No creators found" description="Create a new creator to get started." />}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader><AlertDialogTitle className="text-white">Delete Creator</AlertDialogTitle><AlertDialogDescription className="text-gray-400">Are you sure? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
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
  if (status === 'ACTIVE') {
    return <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">{status}</Badge>
  }
  return <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 text-xs">{status}</Badge>
}
