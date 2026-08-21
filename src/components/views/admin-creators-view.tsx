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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getAdminCreators,
  createCreator,
  deleteCreator,
  getAdminCreatorApplications,
} from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import {
  UserPlus,
  UserCheck,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Video,
  Star,
  Loader2,
  ArrowRight,
  Layers,
} from 'lucide-react'
import type { AdminCreator } from '@/lib/api'

export function AdminCreatorsView() {
  const { navigate, user, setSelectedCreatorId } = useAppStore()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedCreator, setSelectedCreator] = useState<AdminCreator | null>(null)
  const [deleteDialogCreator, setDeleteDialogCreator] = useState<AdminCreator | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Create creator form state
  const [newEmail, setNewEmail] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newCreatorName, setNewCreatorName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newDescription, setNewDescription] = useState('')

  // Creators Catalog Query
  const { data, isLoading } = useQuery({
    queryKey: ['admin-creators-catalog', user?.id, page, search],
    queryFn: () => getAdminCreators({ page, limit: 15, search: search || undefined }),
    enabled: !!user && user.role === 'ADMIN',
  })

  // Pending Applications Count for quick badge
  const { data: pendingAppsData } = useQuery({
    queryKey: ['admin-creator-applications-count', user?.id],
    queryFn: () => getAdminCreatorApplications({ status: 'PENDING', limit: 1 }),
    enabled: !!user && user.role === 'ADMIN',
  })

  // Create Creator Mutation
  const createMutation = useMutation({
    mutationFn: () =>
      createCreator({
        email: newEmail,
        displayName: newDisplayName,
        creatorName: newCreatorName,
        password: newPassword,
        description: newDescription || undefined,
      }),
    onSuccess: () => {
      toast.success('New Creator Account Provisioned!')
      setCreateModalOpen(false)
      setNewEmail('')
      setNewDisplayName('')
      setNewCreatorName('')
      setNewPassword('')
      setNewDescription('')
      queryClient.invalidateQueries({ queryKey: ['admin-creators-catalog'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-recent-audit-logs'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Creator creation failed')
    },
  })

  // Delete Creator Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCreator(id),
    onSuccess: () => {
      toast.success('Creator privileges revoked & account deleted')
      setDeleteDialogCreator(null)
      setSelectedCreator(null)
      queryClient.invalidateQueries({ queryKey: ['admin-creators-catalog'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-recent-audit-logs'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Deletion failed')
    },
  })

  const creators = data?.data || []
  const pendingCount = pendingAppsData?.pagination?.total ?? 0

  return (
    <AdminLayout>
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Approved Creators Catalog</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Content Partners
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Directory of verified and authorized content creators actively publishing on VidFlow.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => navigate('admin-applications')}
            variant="outline"
            className="text-xs bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 h-9"
          >
            <UserCheck className="w-3.5 h-3.5 mr-1.5" />
            <span>Applications Queue</span>
            {pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-black">
                {pendingCount}
              </span>
            )}
          </Button>

          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Provision Creator
          </Button>
        </div>
      </div>

      {/* 2. Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search creator handles or names..."
            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 h-9 text-xs focus-visible:ring-zinc-700"
          />
        </div>
      </div>

      {/* 3. Creators Table */}
      <Card className="bg-zinc-900/90 border-zinc-800 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs">Loading approved creators...</p>
            </div>
          ) : creators.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400 text-xs font-semibold">Creator Profile</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Creator Handle</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold text-right">Published Videos</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creators.map((c) => (
                    <TableRow
                      key={c.id}
                      className="border-zinc-800/60 hover:bg-zinc-800/40 transition-colors"
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 border border-amber-500/30 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow">
                            {c.creatorName?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{c.user.displayName || c.creatorName}</p>
                            <p className="text-[11px] text-zinc-400 truncate">{c.user.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 font-mono text-xs text-amber-400 font-semibold">
                        @{c.creatorName}
                      </TableCell>

                      <TableCell className="py-3">
                        <AdminStatusBadge status={c.user.status} />
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-200">
                          <Video className="w-3.5 h-3.5 text-violet-400" />
                          {c.videoCount}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedCreator(c)}
                            className="h-7 text-xs bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white"
                          >
                            Inspect
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteDialogCreator(c)}
                            className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            title="Revoke Privileges & Delete Creator"
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
              <UserPlus className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-300">No creators found</p>
              <p className="text-xs text-zinc-500">
                Review pending applications to approve creators or manually provision one.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. CREATOR INSPECTOR DRAWER */}
      {selectedCreator && (
        <AdminDrawer
          open={!!selectedCreator}
          title={`@${selectedCreator.creatorName}`}
          subtitle={`Creator Profile ID: ${selectedCreator.id}`}
          badge={<AdminStatusBadge status={selectedCreator.user.status} />}
          onClose={() => setSelectedCreator(null)}
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogCreator(selectedCreator)}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Revoke Creator Privileges
              </Button>

              <Button
                onClick={() => {
                  setSelectedCreatorId(selectedCreator.id)
                  navigate('creator-profile')
                }}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs"
              >
                <span>View Public Profile</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          }
        >
          {/* Identity Header */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 text-white font-black text-base flex items-center justify-center shadow-lg">
              {selectedCreator.creatorName?.[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <h4 className="text-base font-bold text-white">@{selectedCreator.creatorName}</h4>
              <p className="text-xs text-zinc-400">{selectedCreator.user.displayName} • {selectedCreator.user.email}</p>
            </div>
          </div>

          {/* Description */}
          {selectedCreator.description && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Creator Bio / Description
              </span>
              <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80">
                {selectedCreator.description}
              </p>
            </div>
          )}

          {/* Publishing Footprint */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-violet-400" />
              Catalog Statistics
            </span>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <p className="text-xs text-zinc-400">Published Videos</p>
                <p className="text-lg font-bold text-white">{selectedCreator.videoCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <p className="text-xs text-zinc-400">Status</p>
                <p className="text-lg font-bold text-emerald-400">{selectedCreator.user.status}</p>
              </div>
            </div>
          </div>
        </AdminDrawer>
      )}

      {/* 5. MANUAL PROVISION CREATOR MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-lg shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-cyan-400" />
              Provision Creator Account
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate()
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold">Email Address</Label>
              <Input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="creator@vidflow.com"
                className="bg-zinc-900 border-zinc-800 text-white text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Display Name</Label>
                <Input
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Sarah Miller"
                  className="bg-zinc-900 border-zinc-800 text-white text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Creator Handle</Label>
                <Input
                  required
                  value={newCreatorName}
                  onChange={(e) => setNewCreatorName(e.target.value)}
                  placeholder="sarah_films"
                  className="bg-zinc-900 border-zinc-800 text-white text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold">Account Password</Label>
              <Input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-zinc-900 border-zinc-800 text-white text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold">Creator Description / Bio</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                placeholder="Short bio about this creator..."
                className="bg-zinc-900 border-zinc-800 text-white text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="bg-zinc-900 border-zinc-800 text-zinc-400 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs"
              >
                {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Provision Creator
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. REVOKE / DELETE CONFIRMATION DIALOG */}
      <AdminConfirmDialog
        open={!!deleteDialogCreator}
        title="Revoke Creator Privileges"
        description={`Are you sure you want to delete creator @${deleteDialogCreator?.creatorName}? This will revoke their creator status and delete their creator profile.`}
        confirmText="Revoke Privileges"
        cancelText="Cancel"
        requireReason={true}
        reasonLabel="Mandatory reason for revocation"
        variant="danger"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteDialogCreator) {
            deleteMutation.mutate(deleteDialogCreator.id)
          }
        }}
        onClose={() => setDeleteDialogCreator(null)}
      />
    </AdminLayout>
  )
}
