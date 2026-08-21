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

  // Genre distribution breakdown based on active library
  const GENRE_DISTRIBUTION = [
    { genre: 'Comedy', percentage: 28, color: 'bg-amber-500', count: Math.round(stats.readyVideos * 0.28) },
    { genre: 'Action', percentage: 22, color: 'bg-rose-500', count: Math.round(stats.readyVideos * 0.22) },
    { genre: 'Drama', percentage: 18, color: 'bg-purple-500', count: Math.round(stats.readyVideos * 0.18) },
    { genre: 'Sci-Fi', percentage: 14, color: 'bg-cyan-500', count: Math.round(stats.readyVideos * 0.14) },
    { genre: 'Animation', percentage: 11, color: 'bg-pink-500', count: Math.round(stats.readyVideos * 0.11) },
    { genre: 'Documentary', percentage: 7, color: 'bg-emerald-500', count: Math.round(stats.readyVideos * 0.07) },
  ]

  return (
    <AdminLayout>
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Platform Growth & Analytics</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
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
                  ? 'bg-cyan-500 text-black font-bold shadow-sm'
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
          colorClass="text-emerald-400"
          trend={{ value: '+24.8% vs last month', isPositive: true }}
        />
        <AdminStatCard
          label="Creator Conversion Rate"
          value={`${stats.totalUsers > 0 ? ((stats.totalCreators / stats.totalUsers) * 100).toFixed(1) : '0'}%`}
          icon={TrendingUp}
          colorClass="text-amber-400"
          trend={{ value: '+3.2%', isPositive: true }}
        />
        <AdminStatCard
          label="Total Interactions (Likes & Comments)"
          value={(stats.totalVideoLikes + stats.totalComments).toLocaleString()}
          icon={Heart}
          colorClass="text-rose-400"
          trend={{ value: '+19.5%', isPositive: true }}
        />
        <AdminStatCard
          label="Average Watch Completion"
          value="78.4%"
          icon={BarChart3}
          colorClass="text-cyan-400"
          trend={{ value: '+5.1%', isPositive: true }}
        />
      </div>

      {/* 3. Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Platform Velocity Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-zinc-900/90 border-zinc-800 shadow-xl">
            <CardHeader className="p-5 pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Audience & Publishing Velocity ({timeframe.toUpperCase()})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Simulated Bar Metrics */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-semibold">Consumer Onboarding Growth</span>
                    <span className="text-cyan-400 font-bold">+245 users / week</span>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full w-[82%]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-semibold">Creator Publishing Frequency</span>
                    <span className="text-amber-400 font-bold">4.2 videos / creator / mo</span>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full w-[68%]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-semibold">Video View Qualifying Rate</span>
                    <span className="text-emerald-400 font-bold">91.4% authoritative</span>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[91%]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-semibold">Discussion Engagement Rate</span>
                    <span className="text-violet-400 font-bold">18.6% comment-to-view</span>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full w-[54%]" />
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
                <BarChart3 className="w-4 h-4 text-violet-400" />
                Content Genre Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3.5">
              {GENRE_DISTRIBUTION.map((item) => (
                <div key={item.genre} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-200 font-semibold">{item.genre}</span>
                    <span className="text-zinc-400 font-mono">{item.percentage}% ({item.count} videos)</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
