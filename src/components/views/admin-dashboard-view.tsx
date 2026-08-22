'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import { AdminStatCard } from '@/components/admin/ui/admin-stat-card'
import { AdminStatusBadge } from '@/components/admin/ui/admin-status-badge'
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
import {
  getAdminDashboard,
  getAdminCreatorApplications,
  getAdminVideos,
  getAdminAuditLogs,
} from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { format } from 'date-fns'
import {
  Users,
  UserCheck,
  Video,
  Eye,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  Sparkles,
  Activity,
  Flame,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react'

export function AdminDashboardView() {
  const { navigate, user } = useAppStore()
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  // Dashboard Stats Query
  const { data: dashboardData, isLoading: dashLoading } = useQuery({
    queryKey: ['admin-dashboard', user?.id],
    queryFn: getAdminDashboard,
    enabled: !!user && user.role === 'ADMIN',
  })

  // Pending Creator Applications Query
  const { data: pendingAppsData } = useQuery({
    queryKey: ['admin-pending-apps-preview', user?.id],
    queryFn: () => getAdminCreatorApplications({ status: 'PENDING', limit: 5 }),
    enabled: !!user && user.role === 'ADMIN',
  })

  // Processing/Failed Videos Query
  const { data: pendingVideosData } = useQuery({
    queryKey: ['admin-flagged-videos', user?.id],
    queryFn: () => getAdminVideos({ status: 'UNPUBLISHED', limit: 5 }),
    enabled: !!user && user.role === 'ADMIN',
  })

  // Recent Audit Logs
  const { data: auditLogsData } = useQuery({
    queryKey: ['admin-recent-audit-logs', user?.id],
    queryFn: () => getAdminAuditLogs({ limit: 6 }),
    enabled: !!user && user.role === 'ADMIN',
  })

  const stats = dashboardData?.stats || {
    totalUsers: 0,
    totalCreators: 0,
    totalVideos: 0,
    readyVideos: 0,
    totalComments: 0,
    totalVideoLikes: 0,
    totalCreatorRatings: 0,
    totalViews: 0,
  }

  const pendingAppsCount = pendingAppsData?.pagination?.total ?? 0
  const unreviewedVideosCount = pendingVideosData?.pagination?.total ?? 0

  return (
    <AdminLayout>
      {/* 1. Header & Live Operational Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Executive Command Center</h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#5E70FF]/15 text-[#5E70FF] border border-[#5E70FF]/30">
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time platform metrics, trust & safety alerts, and administrative oversight.
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg self-start sm:self-auto">
          {(['7d', '30d', '90d', '1y'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                timeframe === t
                  ? 'bg-[#5E70FF] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 2. ATTENTION REQUIRED / URGENT ACTION CARDS */}
      {(pendingAppsCount > 0 || unreviewedVideosCount > 0) && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FF8D28]/10 via-zinc-900 to-zinc-900 border border-[#FF8D28]/30 shadow-xl">
          <div className="flex items-center gap-2 text-[#FF8D28] text-xs font-bold uppercase tracking-wider mb-3">
            <AlertTriangle className="w-4 h-4 animate-bounce" />
            <span>Attention Required ({pendingAppsCount + unreviewedVideosCount} items awaiting action)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingAppsCount > 0 && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/80 border border-[#FF8D28]/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#FF8D28]/20 text-[#FF8D28]">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {pendingAppsCount} Creator Application{pendingAppsCount > 1 ? 's' : ''} Pending
                    </h4>
                    <p className="text-xs text-zinc-400">Consumers waiting for creator approval</p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate('admin-applications')}
                  size="sm"
                  className="bg-[#FF8D28] hover:bg-[#FF8D28]/90 text-black font-bold text-xs h-8"
                >
                  Review Queue
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            )}

            {unreviewedVideosCount > 0 && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/80 border border-[#DF4D50]/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#DF4D50]/20 text-[#DF4D50]">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {unreviewedVideosCount} Video{unreviewedVideosCount > 1 ? 's' : ''} Require Moderation
                    </h4>
                    <p className="text-xs text-zinc-400">Unpublished or flagged content</p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate('admin-videos')}
                  size="sm"
                  className="bg-[#DF4D50] hover:bg-[#DF4D50]/90 text-white font-bold text-xs h-8"
                >
                  Inspect Content
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. PLATFORM SNAPSHOT KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AdminStatCard
          label="Total Registered Users"
          value={stats.totalUsers}
          icon={Users}
          colorClass="text-[#5E70FF]"
          trend={(stats as any)?.trends?.users}
          onClick={() => navigate('admin-users')}
        />
        <AdminStatCard
          label="Approved Creators"
          value={stats.totalCreators}
          icon={UserCheck}
          colorClass="text-[#24BBA9]"
          trend={(stats as any)?.trends?.creators}
          badge={pendingAppsCount > 0 ? `${pendingAppsCount} pending` : undefined}
          onClick={() => navigate('admin-creators')}
        />
        <AdminStatCard
          label="Total Published Videos"
          value={stats.readyVideos}
          icon={Video}
          colorClass="text-[#5E70FF]"
          trend={(stats as any)?.trends?.videos}
          onClick={() => navigate('admin-videos')}
        />
        <AdminStatCard
          label="Authoritative Views"
          value={stats.totalViews}
          icon={Eye}
          colorClass="text-[#24BBA9]"
          onClick={() => navigate('admin-analytics')}
        />
      </div>

      {/* Secondary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-800 text-[#DF4D50]">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">Total Video Likes</p>
            <p className="text-sm font-bold text-white">{(stats.totalVideoLikes || 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-800 text-[#24BBA9]">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">Total Comments</p>
            <p className="text-sm font-bold text-white">{(stats.totalComments || 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-800 text-[#FF8D28]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">Creator Ratings</p>
            <p className="text-sm font-bold text-white">{(stats.totalCreatorRatings || 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-800 text-[#48B321]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">Platform Health</p>
            <p className="text-sm font-bold text-[#48B321]">Operational</p>
          </div>
        </div>
      </div>

      {/* 4. WORKSPACE GRIDS: Pending Creator Queue & Real-Time Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Pending Applications & Recent Videos */}
        <div className="lg:col-span-7 space-y-6">
          {/* Creator Applications Waiting */}
          <Card className="bg-zinc-900/80 border-zinc-800 shadow-md">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-800/80 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#FF8D28]" />
                  Creator Application Review Queue
                </CardTitle>
                <p className="text-xs text-zinc-400">Pending applications requiring admin authorization</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('admin-applications')}
                className="text-xs text-[#5E70FF] hover:text-[#4D5FE8]"
              >
                View All Queue
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {pendingAppsData && pendingAppsData.data.length > 0 ? (
                <div className="divide-y divide-zinc-800/60">
                  {pendingAppsData.data.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#FF8D28]/20 text-[#FF8D28] border border-[#FF8D28]/30 flex items-center justify-center font-bold text-xs shrink-0">
                          {app.user.displayName?.[0]?.toUpperCase() || 'C'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate">
                              {app.user.displayName || app.user.email}
                            </span>
                            <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300">
                              {app.category}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 truncate">
                            {app.description || 'Applicant submitted creator request'}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => navigate('admin-applications')}
                        className="bg-[#FF8D28] hover:bg-[#FF8D28]/90 text-black font-semibold text-xs h-7 shrink-0"
                      >
                        Inspect Dossier
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-500 space-y-1">
                  <CheckCircle2 className="w-7 h-7 mx-auto text-[#48B321]" />
                  <p className="text-sm font-semibold text-zinc-300">Queue is Clear</p>
                  <p className="text-xs text-zinc-500">No pending creator applications awaiting review.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Video Uploads Table */}
          <Card className="bg-zinc-900/80 border-zinc-800 shadow-md">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-800/80 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#5E70FF]" />
                  Recent Video Operations
                </CardTitle>
                <p className="text-xs text-zinc-400">Newly uploaded content across the platform</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('admin-videos')}
                className="text-xs text-[#5E70FF] hover:text-[#4D5FE8]"
              >
                All Videos
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {dashboardData?.recentVideos && dashboardData.recentVideos.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400 text-xs">Video</TableHead>
                      <TableHead className="text-zinc-400 text-xs">Creator</TableHead>
                      <TableHead className="text-zinc-400 text-xs">Status</TableHead>
                      <TableHead className="text-zinc-400 text-xs text-right">Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.recentVideos.map((v) => (
                      <TableRow
                        key={v.id}
                        onClick={() => navigate('admin-videos')}
                        className="border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer"
                      >
                        <TableCell className="font-semibold text-white text-xs max-w-[160px] truncate">
                          {v.title}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-300">
                          @{v.creator?.creatorName || 'creator'}
                        </TableCell>
                        <TableCell>
                          <AdminStatusBadge status={v.status} size="sm" />
                        </TableCell>
                        <TableCell className="text-right text-xs text-zinc-400 font-mono">
                          {format(new Date(v.createdAt), 'MMM d, HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-zinc-500 text-xs">No video uploads recorded.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (5 cols): Live Audit Activity & Quick System Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Activity Feed (Audit Log Stream) */}
          <Card className="bg-zinc-900/80 border-zinc-800 shadow-md">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-800/80 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#48B321]" />
                  Live Administrative Stream
                </CardTitle>
                <p className="text-xs text-zinc-400">Real-time audit log events</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('admin-audit-logs')}
                className="text-xs text-[#5E70FF] hover:text-[#4D5FE8]"
              >
                Full Trail
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {auditLogsData && auditLogsData.data.length > 0 ? (
                auditLogsData.data.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 text-xs"
                  >
                    <div className="p-1.5 rounded-md bg-zinc-800 text-[#5E70FF] mt-0.5 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-white truncate">
                          {log.actor?.displayName || log.actor?.email || 'Admin'}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {format(new Date(log.createdAt), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 font-mono font-medium truncate mt-0.5">
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        Target: {log.entityType} ({log.entityId.slice(-6)})
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-zinc-500 text-xs">
                  No administrative logs recorded yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Operations Portal */}
          <Card className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-zinc-800 shadow-md">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <CardTitle className="text-sm font-bold text-white">Quick Control Center Hub</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <button
                onClick={() => navigate('admin-users')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-[#5E70FF]" />
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-[#5E70FF] transition-colors">
                      User Operations
                    </p>
                    <p className="text-[11px] text-zinc-400">Suspend, activate, or inspect consumers & creators</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </button>

              <button
                onClick={() => navigate('admin-moderation')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors">
                      Trust & Safety Moderation
                    </p>
                    <p className="text-[11px] text-zinc-400">Review flagged videos, comments, and reports</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </button>

              <button
                onClick={() => navigate('admin-analytics')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-[#48B321]" />
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-[#48B321] transition-colors">
                      Platform Growth Telemetry
                    </p>
                    <p className="text-[11px] text-zinc-400">Deep-dive video velocity & retention trends</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
