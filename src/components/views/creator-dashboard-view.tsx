'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getCreatorDashboard } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { DashboardSkeleton } from '@/components/common/loading-skeleton'
import { format } from 'date-fns'
import {
  Video,
  Eye,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowLeft,
} from 'lucide-react'

export function CreatorDashboardView() {
  const navigate = useAppStore((s) => s.navigate)

  const { data, isLoading } = useQuery({
    queryKey: ['creator-dashboard'],
    queryFn: getCreatorDashboard,
  })

  if (isLoading)
    return (
      <div className="min-h-screen bg-gray-950 p-4">
        <DashboardSkeleton />
      </div>
    )
  if (!data) return null

  const stats = [
    { label: 'Total Videos', value: data.totalVideos, icon: Video, accent: 'border-l-gray-400', iconColor: 'text-gray-300' },
    { label: 'Published', value: data.publishedVideos, icon: CheckCircle2, accent: 'border-l-emerald-500', iconColor: 'text-emerald-400' },
    { label: 'Processing', value: data.processingVideos, icon: Clock, accent: 'border-l-amber-500', iconColor: 'text-amber-400' },
    { label: 'Failed', value: data.failedVideos, icon: AlertCircle, accent: 'border-l-red-500', iconColor: 'text-red-400' },
    { label: 'Total Views', value: data.totalViews, icon: Eye, accent: 'border-l-violet-500', iconColor: 'text-violet-400' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center px-4 h-12">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:text-white hover:bg-white/10 -ml-2"
            onClick={() => navigate('feed')}
            aria-label="Back to feed"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 text-center text-lg font-semibold text-white -ml-12">
            Creator Dashboard
          </h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="px-4 pt-4">
        <Button
          onClick={() => navigate('creator-upload')}
          className="bg-white text-gray-950 hover:bg-gray-200 mb-4 font-medium"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Video
        </Button>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {stats.map((s) => (
            <Card
              key={s.label}
              className={`bg-gray-900 border-white/5 border-l-2 ${s.accent} hover:border-white/10 transition-colors`}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <s.icon className={`h-4 w-4 ${s.iconColor} shrink-0`} />
                <div className="min-w-0">
                  <p className="text-xl font-bold text-white truncate">
                    {s.value.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                    {s.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Videos Table */}
        <Card className="bg-gray-900 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-300">
              Recent Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Plus className="h-8 w-8 text-gray-600 mb-2" />
                <p className="text-sm text-gray-500">
                  No videos yet. Upload your first video!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-gray-400 text-xs uppercase tracking-wider">
                        Title
                      </TableHead>
                      <TableHead className="text-gray-400 text-xs uppercase tracking-wider">
                        Status
                      </TableHead>
                      <TableHead className="text-gray-400 text-xs uppercase tracking-wider text-right">
                        Views
                      </TableHead>
                      <TableHead className="text-gray-400 text-xs uppercase tracking-wider text-right">
                        Date
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentVideos.map((v) => (
                      <TableRow
                        key={v.id}
                        className="cursor-pointer border-white/5 hover:bg-white/5"
                        onClick={() => navigate('video-detail', v.id)}
                      >
                        <TableCell className="font-medium text-white max-w-[200px] truncate">
                          {v.title}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={v.status} />
                        </TableCell>
                        <TableCell className="text-right text-gray-300">
                          {v.viewCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm text-gray-500">
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

  const className =
    status === 'READY'
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25'
      : status === 'FAILED'
        ? 'bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25'
        : 'bg-white/10 text-gray-400 border-white/5 hover:bg-white/15'

  return (
    <Badge variant={variant} className={`text-xs font-medium ${className}`}>
      {status}
    </Badge>
  )
}
