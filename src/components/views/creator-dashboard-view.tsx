'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getCreatorDashboard } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { DashboardSkeleton } from '@/components/common/loading-skeleton'
import { format } from 'date-fns'
import { Video, Eye, Upload, CheckCircle2, Clock, AlertCircle, Plus } from 'lucide-react'

export function CreatorDashboardView() {
  const navigate = useAppStore((s) => s.navigate)

  const { data, isLoading } = useQuery({
    queryKey: ['creator-dashboard'],
    queryFn: getCreatorDashboard,
  })

  if (isLoading) return <div className="container mx-auto px-4 py-6"><DashboardSkeleton /></div>
  if (!data) return null

  const stats = [
    { label: 'Total Videos', value: data.totalVideos, icon: Video },
    { label: 'Published', value: data.publishedVideos, icon: CheckCircle2 },
    { label: 'Processing', value: data.processingVideos, icon: Clock },
    { label: 'Failed', value: data.failedVideos, icon: AlertCircle },
    { label: 'Total Views', value: data.totalViews, icon: Eye },
  ]

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Creator Dashboard</h1>
        <Button onClick={() => navigate('creator-upload')}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Video
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Videos</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Plus className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No videos yet. Upload your first video!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentVideos.map((v) => (
                    <TableRow
                      key={v.id}
                      className="cursor-pointer"
                      onClick={() => navigate('video-detail', v.id)}
                    >
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {v.title}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={v.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {v.viewCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {format(new Date(v.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'READY'
      ? 'default'
      : status === 'FAILED'
        ? 'destructive'
        : 'secondary'
  return <Badge variant={variant}>{status}</Badge>
}
