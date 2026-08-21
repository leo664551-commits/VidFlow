'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import { AdminStatusBadge } from '@/components/admin/ui/admin-status-badge'
import { AdminPagination } from '@/components/admin/ui/admin-pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { getAdminAuditLogs } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ScrollText,
  Search,
  Code,
  Clock,
  Shield,
  Loader2,
  FileJson,
} from 'lucide-react'
import type { AdminAuditLogItem } from '@/types'

export function AdminAuditLogsView() {
  const user = useAppStore((s) => s.user)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('ALL')
  const [selectedLog, setSelectedLog] = useState<AdminAuditLogItem | null>(null)

  // Audit Logs Query
  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs-view', user?.id, page, search, actionFilter],
    queryFn: () =>
      getAdminAuditLogs({
        page,
        limit: 15,
        search: search || undefined,
        action: actionFilter === 'ALL' ? undefined : actionFilter,
      }),
    enabled: !!user && user.role === 'ADMIN',
  })

  const logs = data?.data || []

  const handleExportAuditLogs = () => {
    if (!logs || logs.length === 0) {
      toast.error('No audit records available to export')
      return
    }
    const headers = ['Log ID', 'Timestamp', 'Actor Email', 'Action', 'Entity Type', 'Entity ID', 'Metadata']
    const rows = logs.map((l) => [
      l.id,
      l.createdAt,
      l.actor?.email || '',
      l.action,
      l.entityType,
      l.entityId,
      `"${(l.metadata || '').replace(/"/g, '""')}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `vidflow_audit_trail_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Audit trail exported to CSV')
  }

  return (
    <AdminLayout>
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">System Audit Log Trail</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              Immutable Ledger
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Complete cryptographic audit trail of all administrative actions, status changes, and platform reviews.
          </p>
        </div>

        <Button
          onClick={handleExportAuditLogs}
          variant="outline"
          className="text-xs bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 h-9"
        >
          <span>Export Audit Trail (CSV)</span>
        </Button>
      </div>

      {/* 2. Search & Action Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search audit actions, admin email, entity..."
              className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 h-9 text-xs focus-visible:ring-zinc-700"
            />
          </div>

          <Select
            value={actionFilter}
            onValueChange={(v) => {
              setActionFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-56 bg-zinc-900 border-zinc-800 text-white h-9 text-xs">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="ALL" className="text-zinc-300 text-xs">All Administrative Actions</SelectItem>
              <SelectItem value="CREATOR_APPLICATION_APPROVED" className="text-zinc-300 text-xs">
                Creator App Approved
              </SelectItem>
              <SelectItem value="CREATOR_APPLICATION_REJECTED" className="text-zinc-300 text-xs">
                Creator App Rejected
              </SelectItem>
              <SelectItem value="USER_STATUS_CHANGED" className="text-zinc-300 text-xs">
                User Status Changed
              </SelectItem>
              <SelectItem value="VIDEO_STATUS_CHANGED" className="text-zinc-300 text-xs">
                Video Status Changed
              </SelectItem>
              <SelectItem value="COMMENT_STATUS_CHANGED" className="text-zinc-300 text-xs">
                Comment Status Changed
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Audit Logs Table */}
      <Card className="bg-zinc-900/90 border-zinc-800 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs">Loading audit ledger...</p>
            </div>
          ) : logs.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400 text-xs font-semibold">Timestamp</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Administrator</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Action Executed</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold">Entity Target</TableHead>
                    <TableHead className="text-zinc-400 text-xs font-semibold text-right">Forensic Inspector</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="border-zinc-800/60 hover:bg-zinc-800/40 transition-colors"
                    >
                      <TableCell className="py-3 font-mono text-xs text-zinc-400">
                        {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold flex items-center justify-center">
                            {log.actor?.displayName?.[0]?.toUpperCase() || 'A'}
                          </div>
                          <span className="text-xs font-semibold text-white">
                            {log.actor?.displayName || log.actor?.email}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-zinc-800 border border-zinc-700 text-cyan-300">
                          {log.action}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 font-mono text-xs text-zinc-300">
                        <span className="text-zinc-500">{log.entityType}:</span> {log.entityId.slice(-8)}
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLog(log)}
                          className="h-7 text-xs bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300 hover:text-white"
                        >
                          <FileJson className="w-3.5 h-3.5 mr-1" />
                          View Metadata
                        </Button>
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
              <ScrollText className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-300">No audit events found</p>
              <p className="text-xs text-zinc-500">No actions match your search or action filter.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. METADATA JSON INSPECTOR MODAL */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                Audit Record Inspector: {selectedLog.action}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <div>
                  <span className="text-zinc-500">Record ID:</span>
                  <p className="font-mono text-zinc-300">{selectedLog.id}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Timestamp:</span>
                  <p className="font-mono text-zinc-300">
                    {format(new Date(selectedLog.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">Actor Admin:</span>
                  <p className="font-semibold text-white">{selectedLog.actor?.email}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Target Entity:</span>
                  <p className="font-mono text-cyan-400">
                    {selectedLog.entityType} ({selectedLog.entityId})
                  </p>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Payload Metadata (JSON)
                </span>
                <pre className="mt-1 p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-48 scrollbar-thin scrollbar-thumb-zinc-800">
                  {selectedLog.metadata
                    ? JSON.stringify(
                        (() => {
                          try {
                            return JSON.parse(selectedLog.metadata)
                          } catch {
                            return { raw: selectedLog.metadata }
                          }
                        })(),
                        null,
                        2
                      )
                    : '{\n  "status": "NO_EXTRA_METADATA"\n}'}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  )
}
