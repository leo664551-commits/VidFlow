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
import { useToast } from '@/hooks/use-toast'
import { Users, Ban, CheckCircle2 } from 'lucide-react'
import type { UserStatus } from '@/types'

export function AdminUsersView() {
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
        page,
        limit: 10,
        search: search || undefined,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      updateUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
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

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Users</h1>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search users..."
          className="max-w-xs"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="CREATOR">Creator</SelectItem>
            <SelectItem value="CONSUMER">Consumer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DISABLED">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <TableSkeleton rows={5} cols={5} />}

      {!isLoading && data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.displayName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'ACTIVE' ? 'default' : 'destructive'}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          toggleMutation.mutate({
                            id: u.id,
                            status: u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                          })
                        }
                        title={u.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                      >
                        {u.status === 'ACTIVE' ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </Button>
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
        <EmptyState icon={Users} title="No users found" />
      )}
    </div>
  )
}
