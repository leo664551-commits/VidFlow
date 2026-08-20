'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAdminDashboard } from '@/lib/api'
import { DashboardSkeleton } from '@/components/common/loading-skeleton'
import { format } from 'date-fns'
import { Users, Video, Eye, Clock, AlertCircle, CheckCircle2, UserPlus, MessageSquare, ArrowLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/app-store'

export function AdminDashboardView() {
  const navigate = useAppStore((s) => s.navigate)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getAdminDashboard,
  })

  if (isLoading) return <div className="min-h-screen bg-gray-950 p-4"><DashboardSkeleton /></div>
  if (!data) return null

  const stats = [
    { label: 'Consumers', value: data.totalConsumers, icon: Users, color: 'text-emerald-400' },
    { label: 'Creators', value: data.totalCreators, icon: UserPlus, color: 'text-amber-400' },
    { label: 'Total Videos', value: data.totalVideos, icon: Video, color: 'text-violet-400' },
    { label: 'Published', value: data.publishedVideos, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Processing', value: data.processingVideos, icon: Clock, color: 'text-amber-400' },
    { label: 'Failed', value: data.failedVideos, icon: AlertCircle, color: 'text-red-400' },
  ]

  const quickLinks = [
    { label: 'Manage Creators', view: 'admin-creators' as const, icon: UserPlus, color: 'text-amber-400' },
    { label: 'Manage Users', view: 'admin-users' as const, icon: Users, color: 'text-cyan-400' },
    { label: 'Manage Videos', view: 'admin-videos' as const, icon: Video, color: 'text-violet-400' },
    { label: 'Manage Comments', view: 'admin-comments' as const, icon: MessageSquare, color: 'text-rose-400' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center justify-center h-14 px-4 relative">
          <Button variant="ghost" size="icon" className="absolute left-2 sm:left-4 text-gray-400 hover:text-white hover:bg-gray-800" onClick={() => navigate('feed')} aria-label="Back to feed">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
        </div>
      </header>

      <div className="px-4 pt-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {stats.map((s) => (
            <Card key={s.label} className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-800">
                    <s.icon className={`h-4 w-4 ${s.color} shrink-0`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-white">{s.value}</p>
                    <p className="text-xs text-gray-500 truncate">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick links */}
        <div className="space-y-2 mb-6">
          {quickLinks.map((link) => (
            <button
              key={link.view}
              onClick={() => navigate(link.view)}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800/80 transition-colors text-left group"
            >
              <div className="p-2 rounded-lg bg-gray-800">
                <link.icon className={`h-4 w-4 ${link.color}`} />
              </div>
              <span className="text-white text-sm font-medium flex-1">{link.label}</span>
              <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </button>
          ))}
        </div>

        {/* Recent tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-300">Recent Uploads</CardTitle></CardHeader>
            <CardContent><MiniVideoTable videos={data.recentUploads} onRowClick={(id) => navigate('video-detail', id)} /></CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-300">Recent Users</CardTitle></CardHeader>
            <CardContent><MiniUserTable users={data.recentUsers} /></CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-300">Recent Comments</CardTitle></CardHeader>
            <CardContent><MiniCommentTable comments={data.recentComments} /></CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-300">Most Viewed Videos</CardTitle></CardHeader>
            <CardContent><MiniVideoTable videos={data.mostViewedVideos} showViews onRowClick={(id) => navigate('video-detail', id)} /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MiniVideoTable({ videos, showViews, onRowClick }: {
  videos: { id: string; title: string; status: string; viewCount?: number; createdAt: string; creator: { creatorName: string } }[]
  showViews?: boolean
  onRowClick?: (id: string) => void
}) {
  if (videos.length === 0) return <p className="text-sm text-gray-500">No data.</p>
  return (
    <Table>
      <TableHeader><TableRow className="border-gray-800 hover:bg-transparent">
        <TableHead className="text-gray-400">Title</TableHead>
        <TableHead className="text-gray-400">Creator</TableHead>
        <TableHead className="text-gray-400">Status</TableHead>
        {showViews && <TableHead className="text-gray-400 text-right">Views</TableHead>}
        <TableHead className="text-gray-400 text-right">Date</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {videos.map((v) => (
          <TableRow key={v.id} className={`border-gray-800/50 hover:bg-gray-800/50 ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick?.(v.id)}>
            <TableCell className="font-medium text-white max-w-[120px] truncate">{v.title}</TableCell>
            <TableCell className="text-sm text-gray-400">{v.creator.creatorName}</TableCell>
            <TableCell><StatusBadge status={v.status} /></TableCell>
            {showViews && <TableCell className="text-right text-sm text-gray-300">{v.viewCount?.toLocaleString()}</TableCell>}
            <TableCell className="text-right text-sm text-gray-500">{format(new Date(v.createdAt), 'MMM d')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function MiniUserTable({ users }: { users: { id: string; displayName: string; email: string; role: string; status: string }[] }) {
  if (users.length === 0) return <p className="text-sm text-gray-500">No data.</p>
  return (
    <Table>
      <TableHeader><TableRow className="border-gray-800 hover:bg-transparent">
        <TableHead className="text-gray-400">Name</TableHead>
        <TableHead className="text-gray-400">Role</TableHead>
        <TableHead className="text-gray-400">Status</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id} className="border-gray-800/50 hover:bg-gray-800/50">
            <TableCell className="font-medium text-white max-w-[120px] truncate">{u.displayName}</TableCell>
            <TableCell><Badge variant="outline" className="border-gray-700 text-gray-400 text-xs">{u.role}</Badge></TableCell>
            <TableCell><StatusBadge status={u.status} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function MiniCommentTable({ comments }: { comments: { id: string; content: string; user: { displayName: string }; createdAt: string }[] }) {
  if (comments.length === 0) return <p className="text-sm text-gray-500">No data.</p>
  return (
    <Table>
      <TableHeader><TableRow className="border-gray-800 hover:bg-transparent">
        <TableHead className="text-gray-400">User</TableHead>
        <TableHead className="text-gray-400">Comment</TableHead>
        <TableHead className="text-gray-400 text-right">Date</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {comments.map((c) => (
          <TableRow key={c.id} className="border-gray-800/50 hover:bg-gray-800/50">
            <TableCell className="font-medium text-white">{c.user.displayName}</TableCell>
            <TableCell className="max-w-[180px] truncate text-sm text-gray-400">{c.content}</TableCell>
            <TableCell className="text-right text-sm text-gray-500">{format(new Date(c.createdAt), 'MMM d')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'READY' || status === 'ACTIVE' || status === 'VISIBLE') {
    return <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">{status}</Badge>
  }
  if (status === 'FAILED' || status === 'DISABLED' || status === 'HIDDEN') {
    return <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 text-xs">{status}</Badge>
  }
  return <Badge variant="outline" className="border-gray-700 text-gray-400 text-xs">{status}</Badge>
}
