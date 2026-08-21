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
  getAdminUsers,
  updateUserStatus,
} from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Users,
  Search,
  Ban,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Heart,
  Eye,
  Loader2,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react'
import type { AuthUser, UserStatus } from '@/types'

export function AdminUsersView() {
  const user = useAppStore((s) => s.user)
  const queryClient = useQueryClient()

  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CONSUMER' | 'CREATOR' | 'ADMIN' | 'DISABLED'>('ALL')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null)
  const [suspendDialogUser, setSuspendDialogUser] = useState<AuthUser | null>(null)

  // Users Query
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users-view', user?.id, roleFilter, page, search],
    queryFn: () =>
      getAdminUsers({
        page,
        limit: 15,
        search: search || undefined,
        role: roleFilter !== 'ALL' && roleFilter !== 'DISABLED' ? roleFilter : undefined,
        status: roleFilter === 'DISABLED' ? 'DISABLED' : undefined,
      }),
    enabled: !!user && user.role === 'ADMIN',
  })

  // Toggle User Status Mutation (ACTIVE vs DISABLED)
  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: UserStatus; reason?: string }) =>
      updateUserStatus(id, status),
    onSuccess: (res) => {
      toast.success(`User status updated to ${res.status}`)
      setSuspendDialogUser(null)
      if (selectedUser && selectedUser.id === res.id) {
        setSelectedUser({ ...selectedUser, status: res.status })
      }
      queryClient.invalidateQueries({ queryKey: ['admin-users-view'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-recent-audit-logs'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Status update failed')
    },
  })

  const users = data?.data || []

  const handleExportUsers = () => {
    if (!users || users.length === 0) {
      toast.error('No users available to export')
      return
    }
    const headers = ['User ID', 'Display Name', 'Email', 'Role', 'Status', 'Category', 'Created At']
    const rows = users.map((u) => [
      u.id,
      `"${(u.displayName || '').replace(/"/g, '""')}"`,
      u.email,
      u.role,
      u.status,
      u.category || 'General',
      u.createdAt || '',
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `vidflow_users_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('User directory exported to CSV')
  }

  return (
    <AdminLayout>
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">User Directory & Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              Identity Store
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Global directory of all consumer, creator, and administrative accounts on VidFlow.
          </p>
        </div>

        {/* Role & Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg self-start sm:self-auto flex-wrap">
          {(['ALL', 'CONSUMER', 'CREATOR', 'ADMIN', 'DISABLED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setRoleFilter(tab)
                setPage(1)
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                roleFilter === tab
                  ? 'bg-cyan-500 text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tab === 'DISABLED' ? 'Suspended Users' : tab === 'ALL' ? 'All Roles' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Search & Controls Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search users by name or email..."
            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 h-9 text-xs focus-visible:ring-zinc-700"
          />
        </div>

        <Button
          onClick={handleExportUsers}
          variant="outline"
          className="text-xs bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 h-9"
        >
          <span>Export Directory (CSV)</span>
        </Button>
      </div>

      {/* 3. Users High-Density Data Grid */}
      <Card className="bg-zinc-900/90 border-zinc-800 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs">Loading user directory...</p>
            </div>
          ) : users.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400 text-xs font-semibold">User Identity</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Platform Role</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Account Status</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Content Category</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold text-right">Joined</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow
                      key={u.id}
                      className="border-zinc-800/60 hover:bg-zinc-800/40 transition-colors"
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                            {u.displayName?.[0]?.toUpperCase() || u.email[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{u.displayName || u.email}</p>
                            <p className="text-[11px] text-zinc-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <AdminStatusBadge status={u.role} />
                      </TableCell>

                      <TableCell className="py-3">
                        <AdminStatusBadge status={u.status} />
                      </TableCell>

                      <TableCell className="py-3">
                        <span className="text-xs text-zinc-300">
                          {u.category || 'General'}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 text-right text-xs text-zinc-400 font-mono">
                        {u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : '—'}
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedUser(u)}
                            className="h-7 text-xs bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white"
                          >
                            Inspect
                          </Button>

                          {u.role !== 'ADMIN' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSuspendDialogUser(u)}
                              className={`h-7 px-2 text-xs ${
                                u.status === 'ACTIVE'
                                  ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                              }`}
                              title={u.status === 'ACTIVE' ? 'Suspend User' : 'Reactivate User'}
                            >
                              {u.status === 'ACTIVE' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </Button>
                          )}
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
              <Users className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-300">No users found matching query</p>
              <p className="text-xs text-zinc-500">Try adjusting your search criteria or role filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. USER DOSSIER INSPECTOR DRAWER */}
      {selectedUser && (
        <AdminDrawer
          open={!!selectedUser}
          title="User Account Dossier"
          subtitle={`User ID: ${selectedUser.id}`}
          badge={<AdminStatusBadge status={selectedUser.status} />}
          onClose={() => setSelectedUser(null)}
          footer={
            <div className="flex items-center justify-between w-full">
              {selectedUser.role !== 'ADMIN' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSuspendDialogUser(selectedUser)
                  }}
                  className={`text-xs ${
                    selectedUser.status === 'ACTIVE'
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {selectedUser.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => setSelectedUser(null)}
                className="bg-zinc-900 text-white border-zinc-800 text-xs ml-auto"
              >
                Close Dossier
              </Button>
            </div>
          }
        >
          {/* Identity Section */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Profile Details
            </h3>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-black text-base flex items-center justify-center shadow-lg">
                {selectedUser.displayName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h4 className="text-base font-bold text-white">{selectedUser.displayName}</h4>
                <p className="text-xs text-zinc-400">{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <AdminStatusBadge status={selectedUser.role} />
                  <AdminStatusBadge status={selectedUser.status} />
                </div>
              </div>
            </div>
          </div>

          {/* Account Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>Registration Date</span>
              </div>
              <p className="text-sm font-bold text-white">
                {selectedUser.createdAt ? format(new Date(selectedUser.createdAt), 'MMMM d, yyyy') : 'Registered User'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Layers className="w-3.5 h-3.5 text-zinc-500" />
                <span>Assigned Category</span>
              </div>
              <p className="text-sm font-bold text-white">
                {selectedUser.category || 'Standard'}
              </p>
            </div>
          </div>

          {/* Bio / Description */}
          {selectedUser.bio && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                User Biography
              </span>
              <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80">
                {selectedUser.bio}
              </p>
            </div>
          )}

          {/* Activity Breakdown */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              Engagement Footprint
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                <p className="text-xs text-zinc-400">Comments</p>
                <p className="text-base font-bold text-white">
                  {(selectedUser as any)._count?.comments ?? '—'}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                <p className="text-xs text-zinc-400">Likes</p>
                <p className="text-base font-bold text-white">
                  {(selectedUser as any)._count?.videoLikes ?? '—'}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                <p className="text-xs text-zinc-400">Category Edits</p>
                <p className="text-base font-bold text-white">
                  {selectedUser.categoryChangeCount || 0} / 2
                </p>
              </div>
            </div>
          </div>
        </AdminDrawer>
      )}

      {/* 5. SUSPEND / REACTIVATE CONFIRMATION DIALOG */}
      <AdminConfirmDialog
        open={!!suspendDialogUser}
        title={suspendDialogUser?.status === 'ACTIVE' ? 'Suspend User Account' : 'Reactivate User Account'}
        description={
          suspendDialogUser?.status === 'ACTIVE'
            ? `Suspending ${suspendDialogUser?.displayName} will immediately disable their login, feed interactions, and publishing privileges.`
            : `Reactivating ${suspendDialogUser?.displayName} will restore their platform access.`
        }
        confirmText={suspendDialogUser?.status === 'ACTIVE' ? 'Confirm Suspension' : 'Reactivate'}
        cancelText="Cancel"
        requireReason={suspendDialogUser?.status === 'ACTIVE'}
        reasonLabel="Justification for Account Suspension"
        variant={suspendDialogUser?.status === 'ACTIVE' ? 'danger' : 'primary'}
        isPending={statusMutation.isPending}
        onConfirm={(reason) => {
          if (suspendDialogUser) {
            statusMutation.mutate({
              id: suspendDialogUser.id,
              status: suspendDialogUser.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
              reason,
            })
          }
        }}
        onClose={() => setSuspendDialogUser(null)}
      />
    </AdminLayout>
  )
}
