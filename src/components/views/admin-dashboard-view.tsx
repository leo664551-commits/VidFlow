'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getAdminDashboard } from '@/lib/api'
import { DashboardSkeleton } from '@/components/common/loading-skeleton'
import { format } from 'date-fns'
import {
  Users,
  Video,
  Eye,
  Clock,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  MessageSquare,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'

export function AdminDashboardView() {
  const navigate = useAppStore((s) => s.navigate)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getAdminDashboard,
  })

  if (isLoading) return <div className="container mx-auto px-4 py-6"><DashboardSkeleton /></div>
  if (!data) return null

  const stats = [
    { label: 'Consumers', value: data.totalConsumers, icon: Users },
    { label: 'Creators', value: data.totalCreators, icon: UserPlus },
    { label: 'Total Videos', value: data.totalVideos, icon: Video },
    { label: 'Published', value: data.publishedVideos, icon: CheckCircle2 },
    { label: 'Processing', value: data.processingVideos, icon: Clock },
    { label: 'Failed', value: data.failedVideos, icon: AlertCircle },
  ]

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniVideoTable
              videos={data.recentUploads}
              onRowClick={(id) => navigate('video-detail', id)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniUserTable users={data.recentUsers} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniCommentTable comments={data.recentComments} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Viewed Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniVideoTable
              videos={data.mostViewedVideos}
              showViews
              onRowClick={(id) => navigate('video-detail', id)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MiniVideoTable({
  videos,
  showViews,
  onRowClick,
}: {
  videos: { id: string; title: string; status: string; viewCount?: number; createdAt: string; creator: { creatorName: string } }[]
  showViews?: boolean
  onRowClick?: (id: string) => void
}) {
  if (videos.length === 0) {
    return <p className="text-sm text-muted-foreground">No data.</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Creator</TableHead>
          <TableHead>Status</TableHead>
          {showViews && <TableHead className="text-right">Views</TableHead>}
          <TableHead className="text-right">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {videos.map((v) => (
          <TableRow
            key={v.id}
            className={onRowClick ? 'cursor-pointer' : ''}
            onClick={() => onRowClick?.(v.id)}
          >
            <TableCell className="font-medium max-w-[140px] truncate">{v.title}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{v.creator.creatorName}</TableCell>
            <TableCell>
              <Badge variant={v.status === 'READY' ? 'default' : v.status === 'FAILED' ? 'destructive' : 'secondary'}>
                {v.status}
              </Badge>
            </TableCell>
            {showViews && (
              <TableCell className="text-right text-sm">{v.viewCount?.toLocaleString()}</TableCell>
            )}
            <TableCell className="text-right text-sm text-muted-foreground">{format(new Date(v.createdAt), 'MMM d')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function MiniUserTable({ users }: { users: { id: string; displayName: string; email: string; role: string; status: string }[] }) {
  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">No data.</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell className="font-medium max-w-[140px] truncate">{u.displayName}</TableCell>
            <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
            <TableCell>
              <Badge variant={u.status === 'ACTIVE' ? 'default' : 'destructive'}>{u.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function MiniCommentTable({ comments }: { comments: { id: string; content: string; user: { displayName: string }; createdAt: string }[] }) {
  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">No data.</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Comment</TableHead>
          <TableHead className="text-right">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {comments.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{c.user.displayName}</TableCell>
            <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{c.content}</TableCell>
            <TableCell className="text-right text-sm text-muted-foreground">{format(new Date(c.createdAt), 'MMM d')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
