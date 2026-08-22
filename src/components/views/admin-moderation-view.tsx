'use client'

import { useState } from 'react'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import { AdminStatusBadge } from '@/components/admin/ui/admin-status-badge'
import { AdminDrawer } from '@/components/admin/ui/admin-drawer'
import { AdminConfirmDialog } from '@/components/admin/ui/admin-confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Video,
  MessageSquare,
  User,
  Clock,
  Filter,
} from 'lucide-react'
import type { AdminReportItem } from '@/types'

// Realistic initial trust & safety reports state
const INITIAL_REPORTS: AdminReportItem[] = [
  {
    id: 'rep_101',
    type: 'VIDEO',
    targetId: 'vid_cyber_neon',
    targetTitle: 'Neon Nights & Cyber City',
    targetAuthor: 'Sarah Miller',
    reporterName: 'alex_viewer',
    reason: 'Possible audio copyright infringement reported in opening track.',
    priority: 'HIGH',
    status: 'OPEN',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'rep_102',
    type: 'COMMENT',
    targetId: 'comm_998',
    targetTitle: 'Comment on Comedy Special',
    targetAuthor: 'troll_user99',
    reporterName: 'elena_rodriguez',
    reason: 'Harassment and abusive language directed at creator.',
    priority: 'NORMAL',
    status: 'OPEN',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'rep_103',
    type: 'USER',
    targetId: 'usr_spam_bot',
    targetTitle: 'User Profile @bot_deals',
    targetAuthor: 'bot_deals',
    reporterName: 'john_consumer',
    reason: 'Automated spam account posting malicious external links.',
    priority: 'HIGH',
    status: 'IN_REVIEW',
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
  {
    id: 'rep_104',
    type: 'VIDEO',
    targetId: 'vid_standup_clip',
    targetTitle: 'Late Night Standup Clip',
    targetAuthor: 'Stellar Studios',
    reporterName: 'marcus_chen',
    reason: 'Age rating classification discrepancy (contains mature themes).',
    priority: 'LOW',
    status: 'RESOLVED',
    createdAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
  },
]

export function AdminModerationView() {
  const [reports, setReports] = useState<AdminReportItem[]>(INITIAL_REPORTS)
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'VIDEO' | 'COMMENT' | 'USER'>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH' | 'NORMAL' | 'LOW'>('ALL')
  const [selectedReport, setSelectedReport] = useState<AdminReportItem | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    action: 'REMOVE' | 'DISMISS' | 'SUSPEND'
    report: AdminReportItem | null
  }>({ open: false, action: 'DISMISS', report: null })

  const filteredReports = reports.filter((r) => {
    if (typeFilter !== 'ALL' && r.type !== typeFilter) return false
    if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false
    return true
  })

  const highPriorityCount = reports.filter((r) => r.priority === 'HIGH' && r.status === 'OPEN').length

  const handleResolveReport = (reportId: string, resolution: 'RESOLVED' | 'DISMISSED') => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: resolution } : r))
    )
    toast.success(`Report #${reportId.slice(-4)} marked as ${resolution}`)
    setSelectedReport(null)
    setActionDialog({ open: false, action: 'DISMISS', report: null })
  }

  return (
    <AdminLayout>
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Trust & Safety Moderation Queue</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DF4D50]/15 text-[#DF4D50] border border-[#DF4D50]/30">
              Active Triage
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Priority-tiered moderation queue for community reports across videos, comments, and users.
          </p>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg self-start sm:self-auto">
          {(['ALL', 'HIGH', 'NORMAL', 'LOW'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                priorityFilter === p
                  ? p === 'HIGH'
                    ? 'bg-[#DF4D50] text-white font-bold'
                    : 'bg-[#5E70FF] text-white font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {p === 'HIGH' && highPriorityCount > 0 ? `HIGH (${highPriorityCount})` : p}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Priority Summary Banner */}
      {highPriorityCount > 0 && (
        <div className="p-4 rounded-xl bg-[#DF4D50]/10 border border-[#DF4D50]/30 flex items-center justify-between gap-4 text-xs text-zinc-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#DF4D50]/20 text-[#DF4D50] shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">{highPriorityCount} Urgent Safety Reports Pending</p>
              <p className="text-zinc-400">Requires administrative inspection within 2 hours.</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setPriorityFilter('HIGH')}
            className="bg-[#DF4D50] hover:bg-[#DF4D50]/90 text-white font-bold text-xs h-8"
          >
            Filter Urgent
          </Button>
        </div>
      )}

      {/* 3. Entity Type Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-xs font-semibold">
        {(['ALL', 'VIDEO', 'COMMENT', 'USER'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              typeFilter === t
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t === 'ALL' ? 'All Report Types' : `${t} Reports`}
          </button>
        ))}
      </div>

      {/* 4. Moderation Reports Table */}
      <Card className="bg-zinc-900/90 border-zinc-800 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {filteredReports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400 text-xs font-semibold">Priority</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-semibold">Reported Entity</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-semibold">Reason / Violation</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-semibold text-right">Reported</TableHead>
                  <TableHead className="text-zinc-400 text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((r) => (
                  <TableRow
                    key={r.id}
                    className="border-zinc-800/60 hover:bg-zinc-800/40 transition-colors"
                  >
                    <TableCell className="py-3">
                      <AdminStatusBadge status={r.priority} />
                    </TableCell>

                    <TableCell className="py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                        {r.type === 'VIDEO' ? (
                          <Video className="w-3.5 h-3.5 text-[#5E70FF]" />
                        ) : r.type === 'COMMENT' ? (
                          <MessageSquare className="w-3.5 h-3.5 text-[#24BBA9]" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-[#FF8D28]" />
                        )}
                        {r.type}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 max-w-[180px]">
                      <p className="text-xs font-bold text-white truncate">{r.targetTitle || r.targetId}</p>
                      <p className="text-[11px] text-zinc-400 truncate">By {r.targetAuthor || 'Author'}</p>
                    </TableCell>

                    <TableCell className="py-3 max-w-[280px]">
                      <p className="text-xs text-zinc-200 truncate" title={r.reason}>
                        {r.reason}
                      </p>
                      <p className="text-[10px] text-zinc-500">Reported by @{r.reporterName}</p>
                    </TableCell>

                    <TableCell className="py-3">
                      <AdminStatusBadge status={r.status} />
                    </TableCell>

                    <TableCell className="py-3 text-right text-xs text-zinc-400 font-mono">
                      {format(new Date(r.createdAt), 'HH:mm • MMM d')}
                    </TableCell>

                    <TableCell className="py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedReport(r)}
                        className="h-7 text-xs bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white"
                      >
                        Triage Case
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-16 text-center text-zinc-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-[#48B321]" />
              <p className="text-sm font-semibold text-zinc-300">No reports in current view</p>
              <p className="text-xs text-zinc-500">Trust & Safety queue is clear for selected filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. REPORT TRIAGE DRAWER */}
      {selectedReport && (
        <AdminDrawer
          open={!!selectedReport}
          title={`Triage Report #${selectedReport.id.slice(-4)}`}
          subtitle={`Entity: ${selectedReport.type} (${selectedReport.targetId})`}
          badge={<AdminStatusBadge status={selectedReport.priority} />}
          onClose={() => setSelectedReport(null)}
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                onClick={() => handleResolveReport(selectedReport.id, 'DISMISSED')}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Dismiss as False Report
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() =>
                    setActionDialog({
                      open: true,
                      action: 'REMOVE',
                      report: selectedReport,
                    })
                  }
                  className="bg-[#DF4D50] hover:bg-[#DF4D50]/90 text-white font-bold text-xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                  Take Down Content
                </Button>

                <Button
                  onClick={() => handleResolveReport(selectedReport.id, 'RESOLVED')}
                  className="bg-[#48B321] hover:bg-[#48B321]/90 text-white font-bold text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Resolve Case
                </Button>
              </div>
            </div>
          }
        >
          {/* Reason Box */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Report Description & Evidence
            </span>
            <p className="text-sm text-zinc-100 leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              {selectedReport.reason}
            </p>
          </div>

          {/* Details Grid */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Incident Details</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Reported Target:</span>
                <span className="text-white font-semibold">{selectedReport.targetTitle}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Target Author:</span>
                <span className="text-white font-semibold">{selectedReport.targetAuthor}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Reporter:</span>
                <span className="text-white font-semibold">@{selectedReport.reporterName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-400">Report Timestamp:</span>
                <span className="text-zinc-300 font-mono">
                  {format(new Date(selectedReport.createdAt), 'MMMM d, yyyy HH:mm')}
                </span>
              </div>
            </div>
          </div>
        </AdminDrawer>
      )}

      {/* 6. TAKE DOWN CONFIRMATION DIALOG */}
      <AdminConfirmDialog
        open={actionDialog.open}
        title="Enforce Content Take-Down"
        description="Taking down this content will immediately unpublish it from the platform and notify the content author."
        confirmText="Confirm Take-Down"
        cancelText="Cancel"
        requireReason={true}
        reasonLabel="Policy Violation Justification"
        variant="danger"
        onConfirm={(reason) => {
          if (actionDialog.report) {
            handleResolveReport(actionDialog.report.id, 'RESOLVED')
          }
        }}
        onClose={() => setActionDialog({ open: false, action: 'DISMISS', report: null })}
      />
    </AdminLayout>
  )
}
