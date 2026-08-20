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
import { PaginationControls } from '@/components/common/pagination-controls'
import { TableSkeleton } from '@/components/common/loading-skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { getAdminUsers, updateUserStatus } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'
import { Users, Ban, CheckCircle2, ArrowLeft } from 'lucide-react'
import type { UserStatus } from '@/types'

export function AdminUsersView() {
  const navigate = useAppStore((s) => s.navigate)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter, statusFilter],
    queryFn: () =>
      getAdminUsers({
        page, limit: 10,
        search: search || undefined,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) => updateUserStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast({ title: 'Status updated' }) },
    onError: (err) => { toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' }) },
  })

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center justify-center h-14 px-4 relative">
          <Button variant="ghost" size="icon" className="absolute left-2 sm:left-4 text-gray-400 hover:text-white hover:bg-gray-800" onClick={() => navigate('feed')} aria-label="Back to feed">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-white">Users</h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <Input placeholder="Search users..." className="max-w-xs bg-gray-900 border-gray-800 text-white placeholder-gray-500 h-9 focus-visible:ring-gray-700 focus-visible:border-gray-600" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
            <SelectTrigger className="w-32 bg-gray-900 border-gray-800 text-white h-9 focus:ring-gray-700 focus:border-gray-600"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800">
              <SelectItem value="ALL" className="text-gray-300 focus:bg-gray-800 focus:text-white">All Roles</SelectItem>
              <SelectItem value="ADMIN" className="text-gray-300 focus:bg-gray-800 focus:text-white">Admin</SelectItem>
              <SelectItem value="CREATOR" className="text-gray-300 focus:bg-gray-800 focus:text-white">Creator</SelectItem>
              <SelectItem value="CONSUMER" className="text-gray-300 focus:bg-gray-800 focus:text-white">Consumer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-32 bg-gray-900 border-gray-800 text-white h-9 focus:ring-gray-700 focus:border-gray-600"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800">
              <SelectItem value="ALL" className="text-gray-300 focus:bg-gray-800 focus:text-white">All Statuses</SelectItem>
              <SelectItem value="ACTIVE" className="text-gray-300 focus:bg-gray-800 focus:text-white">Active</SelectItem>
              <SelectItem value="DISABLED" className="text-gray-300 focus:bg-gray-800 focus:text-white">Disabled</SelectItem>
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
                  <TableHead className="text-gray-400">Name</TableHead><TableHead className="text-gray-400">Email</TableHead><TableHead className="text-gray-400">Role</TableHead><TableHead className="text-gray-400">Status</TableHead><TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {data.data.map((u) => (
                    <TableRow key={u.id} className="border-gray-800/50 hover:bg-gray-800/50">
                      <TableCell className="font-medium text-white">{u.displayName}</TableCell>
                      <TableCell className="text-sm text-gray-400">{u.email}</TableCell>
                      <TableCell><Badge variant="outline" className="border-gray-700 text-gray-400 text-xs">{u.role}</Badge></TableCell>
                      <TableCell><StatusBadge status={u.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8" onClick={() => toggleMutation.mutate({ id: u.id, status: u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' })}>
                          {u.status === 'ACTIVE' ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationControls page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
          </>
        )}
        {!isLoading && data && data.data.length === 0 && <EmptyState icon={Users} title="No users found" />}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') {
    return <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">{status}</Badge>
  }
  return <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 text-xs">{status}</Badge>
}
