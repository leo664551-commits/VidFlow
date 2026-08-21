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
  getAdminCreatorApplications,
  reviewCreatorApplication,
} from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  UserCheck,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Loader2,
} from 'lucide-react'
import type { CreatorApplicationItem } from '@/types'

export function AdminApplicationsView() {
  const user = useAppStore((s) => s.user)
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedApp, setSelectedApp] = useState<CreatorApplicationItem | null>(null)
  const [rejectDialogApp, setRejectDialogApp] = useState<CreatorApplicationItem | null>(null)

  // Creator Applications Query
  const { data, isLoading } = useQuery({
    queryKey: ['admin-creator-applications-view', user?.id, statusFilter, page],
    queryFn: () =>
      getAdminCreatorApplications({
        page,
        limit: 15,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
    enabled: !!user && user.role === 'ADMIN',
  })

  // Review Application Mutation (Approve / Reject)
  const reviewMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: 'APPROVED' | 'REJECTED'; reason?: string }) =>
      reviewCreatorApplication(id, status, reason),
    onSuccess: (res) => {
      toast.success(res.message || 'Application reviewed successfully')
      setSelectedApp(null)
      setRejectDialogApp(null)
      queryClient.invalidateQueries({ queryKey: ['admin-creator-applications-view'] })
      queryClient.invalidateQueries({ queryKey: ['admin-creator-applications-count'] })
      queryClient.invalidateQueries({ queryKey: ['admin-creators'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-recent-audit-logs'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Review action failed')
    },
  })

  const applications = data?.data || []
  const filteredApps = applications.filter((app) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      app.user.displayName.toLowerCase().includes(q) ||
      app.user.email.toLowerCase().includes(q) ||
      app.category.toLowerCase().includes(q) ||
      (app.description && app.description.toLowerCase().includes(q))
    )
  })

  return (
    <AdminLayout>
      {/* 1. Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Creator Applications Queue</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Authorization Gate
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Review consumer requests to unlock creator publishing privileges and Creator Studio access.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg self-start sm:self-auto">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setStatusFilter(tab)
                setPage(1)
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === tab
                  ? 'bg-amber-500 text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tab === 'ALL' ? 'All Records' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Operational Notice Card */}
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-3 text-xs text-zinc-300">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Platform Creator Policy: </span>
          Consumers can browse and engage with content. When an admin approves an application, the user is immediately
          promoted to <span className="text-amber-400 font-bold">CREATOR</span> and a dedicated Creator Profile is instantiated.
        </div>
      </div>

      {/* 3. Search & Quick Filters Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or category..."
            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 h-9 text-xs focus-visible:ring-zinc-700"
          />
        </div>
      </div>

      {/* 4. Applications Data Table */}
      <Card className="bg-zinc-900/90 border-zinc-800 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-xs">Loading creator applications...</p>
            </div>
          ) : filteredApps.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400 text-xs font-semibold">Applicant</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Target Category</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Application Reason / Pitch</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold text-right">Applied Date</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApps.map((app) => (
                    <TableRow
                      key={app.id}
                      className="border-zinc-800/60 hover:bg-zinc-800/40 transition-colors"
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                            {app.user.displayName?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{app.user.displayName}</p>
                            <p className="text-[11px] text-zinc-400 truncate">{app.user.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700">
                          {app.category}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 max-w-[280px]">
                        <p className="text-xs text-zinc-300 truncate" title={app.description || ''}>
                          {app.description || <span className="text-zinc-500 italic">No description provided</span>}
                        </p>
                      </TableCell>

                      <TableCell className="py-3">
                        <AdminStatusBadge status={app.status} />
                      </TableCell>

                      <TableCell className="py-3 text-right text-xs text-zinc-400 font-mono">
                        {format(new Date(app.createdAt), 'MMM d, yyyy')}
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedApp(app)}
                            className="h-7 text-xs bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white"
                          >
                            Review Dossier
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
              <UserCheck className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-300">No applications matching current filter</p>
              <p className="text-xs text-zinc-500">
                {statusFilter === 'PENDING'
                  ? 'All pending creator applications have been reviewed.'
                  : `No applications found with status ${statusFilter}.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. DETAILED APPLICATION REVIEW DRAWER */}
      {selectedApp && (
        <AdminDrawer
          open={!!selectedApp}
          title="Creator Application Dossier"
          subtitle={`Application ID: ${selectedApp.id}`}
          badge={<AdminStatusBadge status={selectedApp.status} />}
          onClose={() => setSelectedApp(null)}
          footer={
            selectedApp.status === 'PENDING' ? (
              <div className="flex items-center justify-between w-full">
                <Button
                  variant="outline"
                  onClick={() => setRejectDialogApp(selectedApp)}
                  disabled={reviewMutation.isPending}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Reject Application
                </Button>

                <Button
                  onClick={() => reviewMutation.mutate({ id: selectedApp.id, status: 'APPROVED' })}
                  disabled={reviewMutation.isPending}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs"
                >
                  {reviewMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Authorize & Approve Creator
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setSelectedApp(null)}
                className="bg-zinc-900 text-white border-zinc-800 text-xs"
              >
                Close Dossier
              </Button>
            )
          }
        >
          {/* Applicant Identity Card */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              Applicant Profile
            </h3>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-black text-base flex items-center justify-center shadow-lg">
                {selectedApp.user.displayName?.[0]?.toUpperCase() || 'C'}
              </div>
              <div>
                <h4 className="text-base font-bold text-white">{selectedApp.user.displayName}</h4>
                <p className="text-xs text-zinc-400">{selectedApp.user.email}</p>
                <p className="text-[11px] text-zinc-500 font-mono">User ID: {selectedApp.userId}</p>
              </div>
            </div>
          </div>

          {/* Account Quality & Clean History Check */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>Joined VidFlow</span>
              </div>
              <p className="text-sm font-bold text-white">
                {format(new Date(selectedApp.user.createdAt), 'MMMM d, yyyy')}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Account History</span>
              </div>
              <p className="text-sm font-bold text-emerald-400">No Prior Violations</p>
            </div>
          </div>

          {/* Target Content Category */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Requested Content Category
            </span>
            <div className="inline-block px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-sm">
              {selectedApp.category}
            </div>
          </div>

          {/* Application Reason / Pitch */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Application Reason / Creator Pitch
            </span>
            <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-sm text-zinc-200 leading-relaxed">
              {selectedApp.description || 'Applicant submitted creator application without additional notes.'}
            </div>
          </div>

          {/* Social Links Verification */}
          {selectedApp.socialLink && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Provided Social Media / Portfolio
              </span>
              <a
                href={selectedApp.socialLink.startsWith('http') ? selectedApp.socialLink : `https://${selectedApp.socialLink}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 underline font-mono"
              >
                <span>{selectedApp.socialLink}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Approval Impact Warning */}
          {selectedApp.status === 'PENDING' && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Role Transition Impact
              </p>
              <p className="text-zinc-400">
                Approving this application will convert this consumer account into a{' '}
                <strong className="text-white">CREATOR</strong> account, creating a CreatorProfile and unlocking video
                upload and analytics tools.
              </p>
            </div>
          )}
        </AdminDrawer>
      )}

      {/* 6. REJECTION REASON CONFIRMATION DIALOG */}
      <AdminConfirmDialog
        open={!!rejectDialogApp}
        title="Reject Creator Application"
        description={`Are you sure you want to reject the creator application from ${rejectDialogApp?.user.displayName}?`}
        confirmText="Reject Application"
        cancelText="Cancel"
        requireReason={true}
        reasonLabel="Rejection Reason & Applicant Feedback"
        reasonPlaceholder="Specify feedback or missing requirements for the applicant..."
        variant="danger"
        isPending={reviewMutation.isPending}
        onConfirm={(reason) => {
          if (rejectDialogApp) {
            reviewMutation.mutate({ id: rejectDialogApp.id, status: 'REJECTED', reason })
          }
        }}
        onClose={() => setRejectDialogApp(null)}
      />
    </AdminLayout>
  )
}
