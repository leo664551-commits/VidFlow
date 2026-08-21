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
import { useAppStore } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'
import { Video, Trash2, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import type { VideoStatus, Genre } from '@/types'

export function AdminVideosView() {
  const { navigate, goBack, user } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VideoStatus | 'ALL'>('ALL')
  const [genreFilter, setGenreFilter] = useState<Genre | 'ALL'>('ALL')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-videos', user?.id, page, search, statusFilter, genreFilter],
    queryFn: () =>
      getAdminVideos({
        page, limit: 10,
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        genre: genreFilter === 'ALL' ? undefined : genreFilter,
      }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VideoStatus }) => updateVideoStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-videos'] }); toast({ title: 'Status updated' }) },
    onError: (err) => { toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' }) },
  })

  const deleteMutation = useMutation({
    mutationFn: adminDeleteVideo,
    onSuccess: () => { setDeleteId(null); queryClient.invalidateQueries({ queryKey: ['admin-videos'] }); toast({ title: 'Video deleted' }) },
  })

  return (
    <div className="h-full w-full overflow-y-auto bg-gray-950 pb-32 select-none scrollbar-thin scrollbar-thumb-zinc-800 scroll-smooth">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center justify-center h-14 px-4 relative">
          <Button variant="ghost" size="icon" className="absolute left-2 sm:left-4 text-gray-400 hover:text-white hover:bg-gray-800" onClick={() => goBack('admin-dashboard')} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-white">Videos</h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <Input placeholder="Search videos..." className="max-w-xs bg-gray-900 border-gray-800 text-white placeholder-gray-500 h-9 focus-visible:ring-gray-700 focus-visible:border-gray-600" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as VideoStatus | 'ALL'); setPage(1) }}>
            <SelectTrigger className="w-36 bg-gray-900 border-gray-800 text-white h-9 focus:ring-gray-700 focus:border-gray-600"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800">
              <SelectItem value="ALL" className="text-gray-300 focus:bg-gray-800 focus:text-white">All Statuses</SelectItem>
              <SelectItem value="READY" className="text-gray-300 focus:bg-gray-800 focus:text-white">Ready</SelectItem>
              <SelectItem value="PROCESSING" className="text-gray-300 focus:bg-gray-800 focus:text-white">Processing</SelectItem>
              <SelectItem value="UPLOADING" className="text-gray-300 focus:bg-gray-800 focus:text-white">Uploading</SelectItem>
              <SelectItem value="FAILED" className="text-gray-300 focus:bg-gray-800 focus:text-white">Failed</SelectItem>
              <SelectItem value="UNPUBLISHED" className="text-gray-300 focus:bg-gray-800 focus:text-white">Unpublished</SelectItem>
            </SelectContent>
          </Select>
          <Select value={genreFilter} onValueChange={(v) => { setGenreFilter(v as Genre | 'ALL'); setPage(1) }}>
            <SelectTrigger className="w-36 bg-gray-900 border-gray-800 text-white h-9 focus:ring-gray-700 focus:border-gray-600"><SelectValue placeholder="Genre" /></SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800">
              <SelectItem value="ALL" className="text-gray-300 focus:bg-gray-800 focus:text-white">All Genres</SelectItem>
              {GENRES.map((g) => (<SelectItem key={g} value={g} className="text-gray-300 focus:bg-gray-800 focus:text-white">{g.replace('_', ' ')}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="px-4">
        {isLoading && <TableSkeleton rows={5} cols={6} />}
        {!isLoading && data && data.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Title</TableHead><TableHead className="text-gray-400">Creator</TableHead><TableHead className="text-gray-400">Genre</TableHead><TableHead className="text-gray-400">Status</TableHead><TableHead className="text-gray-400 text-right">Views</TableHead><TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {data.data.map((v) => (
                    <TableRow key={v.id} className="border-gray-800/50 hover:bg-gray-800/50">
                      <TableCell className="font-medium text-white max-w-[200px] truncate">{v.title}</TableCell>
                      <TableCell className="text-sm text-gray-400">{v.creator.creatorName}</TableCell>
                      <TableCell><Badge variant="outline" className="border-gray-700 text-gray-400 text-xs">{v.genre.replace('_', ' ')}</Badge></TableCell>
                      <TableCell><StatusBadge status={v.status} /></TableCell>
                      <TableCell className="text-right text-gray-300">{(v.viewCount ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {v.status === 'READY' ? (
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8" onClick={() => statusMutation.mutate({ id: v.id, status: 'UNPUBLISHED' })} title="Unpublish"><EyeOff className="h-4 w-4" /></Button>
                          ) : v.status === 'UNPUBLISHED' ? (
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8" onClick={() => statusMutation.mutate({ id: v.id, status: 'READY' })} title="Publish"><Eye className="h-4 w-4" /></Button>
                          ) : null}
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-8 w-8" onClick={() => setDeleteId(v.id)}><Trash2 className="h-4 w-4" /></Button>
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
        {!isLoading && data && data.data.length === 0 && <EmptyState icon={Video} title="No videos found" />}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader><AlertDialogTitle className="text-white">Delete Video</AlertDialogTitle><AlertDialogDescription className="text-gray-400">Are you sure? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
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
  if (status === 'READY') {
    return <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">{status}</Badge>
  }
  if (status === 'FAILED') {
    return <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 text-xs">{status}</Badge>
  }
  return <Badge variant="outline" className="border-gray-700 text-gray-400 text-xs">{status}</Badge>
}
