'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import { AdminStatCard } from '@/components/admin/ui/admin-stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAdminDashboard } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import {
  BarChart3,
  TrendingUp,
  Users,
  Video,
  Eye,
  Heart,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'

export function AdminAnalyticsView() {
  const user = useAppStore((s) => s.user)
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  const { data: dashboardData } = useQuery({
    queryKey: ['admin-dashboard', user?.id],
    queryFn: getAdminDashboard,
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

  const analytics = (dashboardData?.stats as any)?.analytics || {
    users7d: 0,
    creators7d: 0,
    videos7d: 0,
    avgWatchCompletion: '0.0%',
    commentToViewRate: '0.0%',
    likeToViewRate: '0.0%',
    creatorPublishFrequency: '0.0 videos / creator',
    genreDistribution: [],
  }

  const genreDistribution: Array<{ genre: string; percentage: number; count: number; color: string }> =
    analytics.genreDistribution?.length > 0
      ? analytics.genreDistribution
      : [
          { genre: 'Comedy', percentage: 0, color: 'bg-amber-500', count: 0 },
          { genre: 'Action', percentage: 0, color: 'bg-rose-500', count: 0 },
          { genre: 'Drama', percentage: 0, color: 'bg-purple-500', count: 0 },
          { genre: 'Sci-Fi', percentage: 0, color: 'bg-[#24BBA9]', count: 0 },
        ]

  return (
    <AdminLayout>
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Platform Growth & Analytics</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#5E70FF]/15 text-[#5E70FF] border border-[#5E70FF]/30">
              Intelligence
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Deep-dive operational metrics, audience velocity, and video publishing telemetry.
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg self-start sm:self-auto">
          {(['7d', '30d', '90d', '1y'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                timeframe === t
                  ? 'bg-[#5E70FF] text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 2. KPI Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Total Impressions / Views"
          value={stats.totalViews}
          icon={Eye}
          colorClass="text-[#24BBA9]"
        />
        <AdminStatCard
          label="Creator Conversion Rate"
          value={`${stats.totalUsers > 0 ? ((stats.totalCreators / stats.totalUsers) * 100).toFixed(1) : '0'}%`}
          icon={TrendingUp}
          colorClass="text-[#FF8D28]"
        />
        <AdminStatCard
          label="Total Interactions (Likes & Comments)"
          value={(stats.totalVideoLikes + stats.totalComments).toLocaleString()}
          icon={Heart}
          colorClass="text-[#DF4D50]"
        />
        <AdminStatCard
          label="Average Watch Completion"
          value={analytics.avgWatchCompletion}
          icon={BarChart3}
          colorClass="text-[#5E70FF]"
        />
      </div>

      {/* 3. Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Platform Velocity Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-zinc-900/90 border-zinc-800 shadow-xl">
            <CardHeader className="p-5 pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#5E70FF]" />
                Audience & Publishing Velocity ({timeframe.toUpperCase()})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-semibold">Consumer Onboarding (Last 7 Days)</span>
                    <span className="text-[#5E70FF] font-bold">+{analytics.users7d} new users</span>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#5E70FF] rounded-full transition-all"
                      style={{ width: `${stats.totalUsers > 0 ? Math.min(Math.round((analytics.users7d / stats.totalUsers) * 100), 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-semibold">Creator Publishing Frequency</span>
                    <span className="text-[#FF8D28] font-bold">{analytics.creatorPublishFrequency}</span>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF8D28] rounded-full transition-all"
                      style={{ width: `${stats.totalVideos > 0 ? Math.min(Math.round((analytics.videos7d / stats.totalVideos) * 100), 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-semibold">Comment Engagement Rate</span>
                    <span className="text-[#24BBA9] font-bold">{analytics.commentToViewRate} comment-to-view</span>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#24BBA9] rounded-full transition-all"
                      style={{ width: `${parseFloat(analytics.commentToViewRate) || 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-semibold">Like Engagement Rate</span>
                    <span className="text-[#DF4D50] font-bold">{analytics.likeToViewRate} like-to-view</span>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#DF4D50] rounded-full transition-all"
                      style={{ width: `${parseFloat(analytics.likeToViewRate) || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right (5 cols): Genre Distribution */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-zinc-900/90 border-zinc-800 shadow-xl">
            <CardHeader className="p-5 pb-3 border-b border-zinc-800">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#5E70FF]" />
                Content Genre Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3.5">
              {genreDistribution.length > 0 && stats.readyVideos > 0 ? (
                genreDistribution.map((item) => (
                  <div key={item.genre} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-200 font-semibold">{item.genre}</span>
                      <span className="text-zinc-400 font-mono">{item.percentage}% ({item.count} videos)</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  No published video genres recorded in database.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
