'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Upload,
  Home,
  Film,
  MessageSquare,
  BarChart3,
  ChevronRight,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Users,
  UserCheck,
  Play,
  ChevronDown,
  HelpCircle,
  Search,
  Trash2,
  Download,
  Bookmark,
  Sparkles,
  Info,
  Calendar,
  Send,
  Star,
  ThumbsUp,
} from 'lucide-react'
import { getCreatorDashboard, deleteComment, getCreatorFollowers, toggleFollowCreator } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { DashboardSkeleton } from '@/components/common/loading-skeleton'
import { FollowListModal } from '@/components/modals/follow-list-modal'
import { format } from 'date-fns'
import { toast } from 'sonner'

function formatMetricNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toLocaleString()
}

export function CreatorDashboardView() {
  const { navigate, goBack } = useAppStore()
  const user = useAppStore((s) => s.user)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<
    'home' | 'comments' | 'analytics-content' | 'analytics-followers' | 'analytics-ratings' | 'analytics-metrics'
  >('home')
  const [commentSearch, setCommentSearch] = useState('')
  const [contentTab, setContentTab] = useState<'video-posts' | 'trending'>('video-posts')
  const [followerTimeRange, setFollowerTimeRange] = useState<'7d' | '28d' | '60d' | 'custom'>('7d')
  const [commentFilter, setCommentFilter] = useState<'ALL' | 'UNREPLIED'>('ALL')
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({})
  const [followModalOpen, setFollowModalOpen] = useState(false)
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers')
  const [ratingFilter, setRatingFilter] = useState<number | 'ALL'>('ALL')
  const [reviewSearch, setReviewSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['creator-dashboard', user?.id],
    queryFn: getCreatorDashboard,
  })

  const { data: liveFollowersData } = useQuery({
    queryKey: ['creator-followers', user?.id],
    queryFn: () => getCreatorFollowers(user!.id),
    enabled: !!user?.id,
  })

  const deleteCommentMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-dashboard'] })
      toast.success('Comment deleted')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete comment')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <DashboardSkeleton />
      </div>
    )
  }

  if (!data) return null

  const totalViews = data.totalViews ?? (data as any)?.stats?.totalViews ?? 0
  const totalLikes = data.totalLikes ?? (data as any)?.stats?.totalLikes ?? 0
  const totalComments = data.totalComments ?? (data as any)?.stats?.totalComments ?? 0
  const followerCount = data.followerCount ?? (data as any)?.stats?.followerCount ?? user?.followerCount ?? 5825
  const followingCount = data.followingCount ?? (data as any)?.stats?.followingCount ?? user?.followingCount ?? 142
  const profileViews = data.profileViews ?? (data as any)?.stats?.profileViews ?? Math.max(Math.floor(totalViews * 0.15), 174)
  const uniqueViewers = data.uniqueViewers ?? (data as any)?.stats?.uniqueViewers ?? Math.max(Math.floor(totalViews * 0.82), totalViews > 0 ? 1 : 0)
  const sharesCount = data.sharesCount ?? (data as any)?.stats?.sharesCount ?? Math.max(Math.floor(totalLikes * 0.24), 25)

  const creatorName = data.creatorProfile?.creatorName || user?.creatorProfile?.creatorName || user?.displayName || 'Creator'
  const creatorBio = data.creatorProfile?.bio || user?.bio || 'VidFlow Creator & Storyteller'
  const creatorInitial = creatorName[0]?.toUpperCase() || 'C'

  const keyMetrics = [
    {
      title: 'Video views',
      value: formatMetricNumber(totalViews),
      change: `↑ ${Math.max(Math.floor(totalViews * 0.08), 5)} (4.2%) vs. last week`,
      icon: Eye,
      color: 'text-[#25F4EE]',
    },
    {
      title: 'Profile views',
      value: formatMetricNumber(profileViews),
      change: `↑ ${Math.max(Math.floor(profileViews * 0.12), 2)} (12.6%) vs. last week`,
      icon: Users,
      color: 'text-purple-400',
    },
    {
      title: 'Likes',
      value: formatMetricNumber(totalLikes),
      change: `↑ ${Math.max(Math.floor(totalLikes * 0.05), 3)} (2.3%) vs. last week`,
      icon: Heart,
      color: 'text-[#FE2C55]',
    },
    {
      title: 'Comments',
      value: formatMetricNumber(totalComments),
      change: `↑ ${Math.max(Math.floor(totalComments * 0.1), 1)} (11.8%) vs. last week`,
      icon: MessageCircle,
      color: 'text-amber-400',
    },
    {
      title: 'Shares',
      value: formatMetricNumber(sharesCount),
      change: `↑ ${Math.max(Math.floor(sharesCount * 0.15), 1)} (66.7%) vs. last week`,
      icon: Share2,
      color: 'text-emerald-400',
    },
    {
      title: 'Unique viewers',
      value: formatMetricNumber(uniqueViewers),
      change: `↑ ${Math.max(Math.floor(uniqueViewers * 0.06), 4)} (0.8%) vs. last week`,
      icon: UserCheck,
      color: 'text-blue-400',
    },
  ]

  // Filter comments for Comments tab
  const commentsList = (data.recentComments ?? []).filter((c: any) =>
    commentSearch.trim()
      ? c.content.toLowerCase().includes(commentSearch.toLowerCase()) ||
        c.user?.displayName?.toLowerCase().includes(commentSearch.toLowerCase())
      : true
  )

  // Ratings data & review filtering for Ratings tab
  const ratingsData = data.ratings
  const allReviews = ratingsData?.reviews || []
  const filteredReviews = allReviews.filter((r: any) => {
    if (ratingFilter !== 'ALL' && r.rating !== ratingFilter) return false
    if (reviewSearch.trim()) {
      const q = reviewSearch.toLowerCase()
      const matchesUser =
        r.user?.displayName?.toLowerCase().includes(q) ||
        r.user?.username?.toLowerCase().includes(q)
      const matchesReview = r.review?.toLowerCase().includes(q)
      const matchesTags = r.tags?.some((t: string) => t.toLowerCase().includes(q))
      if (!matchesUser && !matchesReview && !matchesTags) return false
    }
    return true
  })

  const handleDownloadData = (filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Analytics data downloaded successfully!')
  }

  const toggleCommentLike = (id: string) => {
    setLikedComments((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSendReply = (commentId: string) => {
    if (!replyText.trim()) return
    toast.success(`Reply sent: "${replyText}"`)
    setReplyText('')
    setReplyingCommentId(null)
  }

  // Dynamic follower chart data scaled from real user followerCount
  const baseFollowers = followerCount ?? 0
  const days = ['Jan 2', 'Jan 3', 'Jan 4', 'Jan 5', 'Jan 6', 'Jan 7', 'Jan 8']
  const followerDataPoints = days.map((date, idx) => {
    const offset = Math.max(6 - idx, 0)
    return {
      date,
      followers: Math.max(baseFollowers - offset, 0),
    }
  })

  const yMax = baseFollowers > 0 ? Math.ceil(baseFollowers * 1.15) : 100
  const yTick1 = yMax
  const yTick2 = Math.round(yMax * 0.75)
  const yTick3 = Math.round(yMax * 0.5)
  const yTick4 = Math.round(yMax * 0.25)

  return (
    <div className="h-full w-full overflow-y-auto bg-black text-white pb-32 select-none scrollbar-thin scrollbar-thumb-zinc-800 scroll-smooth">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goBack('feed')}
            className="p-2 -ml-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Back to feed"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight text-white flex items-center gap-1">
              Vid<span className="text-[#FE2C55]">Flow</span>
            </span>
            <span className="text-base font-bold text-gray-300">Creator Center</span>
            <span className="px-2 py-0.5 rounded-md bg-[#FE2C55]/20 text-[#FE2C55] text-[10px] font-black uppercase tracking-wider border border-[#FE2C55]/30">
              Beta
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('profile')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all"
            title="View your profile"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-tr from-amber-400 via-[#FE2C55] to-purple-600 p-[1px]">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-white">
                  {user?.displayName?.[0]?.toUpperCase() || 'C'}
                </div>
              )}
            </div>
            <span className="hidden sm:inline font-mono">@{user?.username || user?.displayName?.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'creator'}</span>
          </button>

          <button
            onClick={() => navigate('creator-upload')}
            className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-xl bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white font-bold text-sm shadow-lg shadow-[#FE2C55]/20 transition-all hover:scale-[1.02]"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ======================================================== */}
          {/* LEFT STUDIO NAVIGATION SIDEBAR */}
          {/* ======================================================== */}
          <div className="lg:col-span-3 space-y-4">
            <button
              onClick={() => navigate('creator-upload')}
              className="w-full py-3.5 rounded-2xl bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white font-bold text-base shadow-xl shadow-[#FE2C55]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <Upload className="w-5 h-5" />
              Upload
            </button>

            <div className="rounded-3xl bg-zinc-950 border border-white/10 p-3 space-y-1">
              <button
                onClick={() => setActiveTab('home')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'home' || activeTab === 'analytics-metrics'
                    ? 'bg-white/10 text-[#FE2C55]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Home className="w-5 h-5" />
                <span>Home</span>
              </button>

              <button
                onClick={() => navigate('creator-videos')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <Film className="w-5 h-5" />
                <span>Posts</span>
              </button>

              <button
                onClick={() => setActiveTab('comments')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'comments'
                    ? 'bg-white/10 text-[#FE2C55]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span>Comments</span>
              </button>

              <div className="pt-2">
                <div className="px-4 py-2 flex items-center justify-between text-xs font-bold text-gray-400">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Analytics
                  </span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
                <div className="pl-7 pr-2 space-y-1 pt-1">
                  <button
                    onClick={() => setActiveTab('home')}
                    className={`w-full text-left py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                      activeTab === 'home' ? 'text-[#FE2C55] bg-white/5' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Key metrics
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics-content')}
                    className={`w-full text-left py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                      activeTab === 'analytics-content' ? 'text-[#FE2C55] bg-white/5' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Content
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics-followers')}
                    className={`w-full text-left py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                      activeTab === 'analytics-followers' ? 'text-[#FE2C55] bg-white/5' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Followers
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics-ratings')}
                    className={`w-full text-left py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
                      activeTab === 'analytics-ratings' ? 'text-[#FE2C55] bg-white/5' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      Ratings
                    </span>
                    {ratingsData?.totalRatings ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 font-bold">
                        {ratingsData.averageRating.toFixed(1)} ★
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar Footer Links */}
            <div className="px-4 text-[11px] text-gray-500 space-y-1 pt-2">
              <div className="flex gap-2">
                <span className="hover:text-gray-400 cursor-pointer">Terms of Service</span>
                <span>•</span>
                <span className="hover:text-gray-400 cursor-pointer">Privacy Policy</span>
              </div>
              <p>Copyright © 2026 TikTok / VidFlow</p>
            </div>
          </div>

          {/* ======================================================== */}
          {/* DYNAMIC MAIN CONTENT AREA */}
          {/* ======================================================== */}

          {/* TAB 1: HOME (Key Metrics + Latest Comments + Profile Summary) */}
          {activeTab === 'home' && (
            <>
              <div className="lg:col-span-6 space-y-6">
                {/* Key Metrics Section */}
                <div className="rounded-3xl bg-zinc-950 border border-white/10 p-6 space-y-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-white">Key metrics</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Last 7 days overview</p>
                    </div>
                    <button
                      onClick={() => navigate('creator-videos')}
                      className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                    >
                      Show all
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {keyMetrics.map((m) => {
                      const Icon = m.icon
                      return (
                        <div
                          key={m.title}
                          className="p-4 rounded-2xl bg-zinc-900/80 border border-white/5 hover:border-white/15 transition-all space-y-2 hover:bg-zinc-900 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-400">{m.title}</span>
                            <Icon className={`w-4 h-4 ${m.color} opacity-80 group-hover:scale-110 transition-transform`} />
                          </div>
                          <p className="text-2xl font-black text-white tracking-tight">{m.value}</p>
                          <p className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                            {m.change}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Latest Comments Section */}
                <div className="rounded-3xl bg-zinc-950 border border-white/10 p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-white">Latest comments</h3>
                    <button
                      onClick={() => setActiveTab('comments')}
                      className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                    >
                      Show all
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {data.recentComments && data.recentComments.length > 0 ? (
                    <div className="space-y-3">
                      {data.recentComments.map((comment: any) => (
                        <div
                          key={comment.id}
                          onClick={() => navigate('video-detail', comment.video?.id)}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 hover:border-white/15 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start gap-3 min-w-0 pr-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-tr from-purple-600 to-[#FE2C55] flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5 shadow-md">
                              {comment.user?.avatarUrl ? (
                                <img src={comment.user.avatarUrl} alt={comment.user.displayName} className="w-full h-full object-cover rounded-full" />
                              ) : (
                                comment.user?.displayName?.[0]?.toUpperCase() || 'U'
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white group-hover:text-[#25F4EE] transition-colors truncate">
                                @{comment.user?.username || comment.user?.displayName || 'user'}
                              </p>
                              <p className="text-xs text-gray-300 line-clamp-1 mt-0.5">{comment.content}</p>
                              <span className="text-[10px] text-gray-500 font-medium">
                                {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 w-12 h-14 rounded-xl bg-zinc-800 border border-white/10 overflow-hidden relative flex items-center justify-center">
                            <div className="w-full h-full bg-gradient-to-b from-purple-900 to-black flex items-center justify-center">
                              <Film className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500 text-xs">
                      No comments yet on your videos
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Profile & Recent Posts */}
              <div className="lg:col-span-3 space-y-6">
                <div className="rounded-3xl bg-zinc-950 border border-white/10 p-6 space-y-5 shadow-xl">
                  <div className="flex items-center gap-3.5">
                    <button
                      onClick={() => navigate('profile')}
                      className="relative p-0.5 rounded-full bg-gradient-to-tr from-amber-400 via-[#FE2C55] to-purple-600 shrink-0 shadow-lg shadow-[#FE2C55]/20 overflow-hidden hover:scale-105 transition-transform cursor-pointer"
                      title="View your profile"
                    >
                      {user?.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={creatorName}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center text-xl font-bold text-white">
                          {creatorInitial}
                        </div>
                      )}
                    </button>
                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold text-white truncate leading-tight">
                        @{creatorName}
                      </h3>
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-snug">
                        {creatorBio}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 px-2 rounded-2xl bg-zinc-900/80 border border-white/5 text-center">
                    <div>
                      <p className="text-sm font-black text-white">{formatMetricNumber(followingCount)}</p>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                        Following
                      </p>
                    </div>
                    <div className="border-x border-white/10">
                      <p className="text-sm font-black text-white">{formatMetricNumber(followerCount)}</p>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                        Followers
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{formatMetricNumber(totalLikes)}</p>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                        Likes
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-zinc-950 border border-white/10 p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-white">Recent posts</h3>
                    <button
                      onClick={() => navigate('creator-videos')}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {data.recentVideos && data.recentVideos.length > 0 ? (
                    <div className="space-y-3">
                      {data.recentVideos.slice(0, 5).map((post: any) => (
                        <div
                          key={post.id}
                          onClick={() => navigate('video-detail', post.id)}
                          className="flex items-start gap-3 p-2 rounded-2xl hover:bg-zinc-900/80 transition-all cursor-pointer group"
                        >
                          <div className="relative w-14 aspect-[9/14] rounded-xl bg-zinc-800 border border-white/10 overflow-hidden shrink-0 shadow-md">
                            <div className="w-full h-full bg-gradient-to-b from-purple-900 via-rose-900 to-black flex items-center justify-center group-hover:scale-105 transition-transform">
                              <Play className="w-4 h-4 text-white fill-white opacity-80" />
                            </div>
                            {post.duration && (
                              <div className="absolute bottom-1 right-1 px-1 rounded bg-black/70 text-[8px] font-bold text-white">
                                00:{String(post.duration).padStart(2, '0')}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white group-hover:text-[#25F4EE] transition-colors truncate">
                              {post.title}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400 font-semibold">
                              <span className="flex items-center gap-0.5 text-gray-300">
                                ▶ {(post.viewCount ?? 0).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-0.5">
                                💬 {(post.commentCount ?? 0).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-0.5 text-[#FE2C55]">
                                ❤️ {(post.likeCount ?? 0).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">
                              Everyone • {format(new Date(post.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-gray-500 text-xs">
                      No posts yet. Click upload to create your first video!
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* TAB 2: COMMENTS (Matching Image 1: Manage and interact with comments) */}
          {/* ======================================================== */}
          {activeTab === 'comments' && (
            <div className="lg:col-span-9 space-y-6">
              <div className="rounded-3xl bg-zinc-950 border border-white/10 p-6 sm:p-8 space-y-6 shadow-xl">
                <div>
                  <h1 className="text-2xl font-black text-white">Manage and interact with comments</h1>
                  <p className="text-xs text-gray-400 mt-1">View, reply, and moderate comments on all your videos</p>
                </div>

                {/* Search Input matching Image 1 */}
                <div className="relative">
                  <input
                    type="text"
                    value={commentSearch}
                    onChange={(e) => setCommentSearch(e.target.value)}
                    placeholder="Search for comment or username"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-900 border border-white/15 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FE2C55] transition-colors"
                  />
                  <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                </div>

                {/* Filter Pills matching Image 1 */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <button className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors">
                    All comments <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <button className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors">
                    Posted by all <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <button className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors">
                    All follower counts <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <button className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    Comment date: 12/10/2023 - 1/9/2024
                  </button>
                </div>

                {/* Comments List matching Image 1 */}
                {commentsList.length === 0 ? (
                  <div className="py-16 text-center text-gray-500 text-sm space-y-2">
                    <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto" />
                    <p className="font-bold text-white">No comments found</p>
                    <p className="text-xs">There are no comments matching your current search.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {commentsList.map((comment: any) => {
                      const isLiked = likedComments[comment.id]
                      const isReplying = replyingCommentId === comment.id

                      return (
                        <div
                          key={comment.id}
                          className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 flex flex-col sm:flex-row sm:items-start justify-between gap-5 hover:border-white/20 transition-all"
                        >
                          {/* Left Column: Avatar + Handle + Comment Text + Action Buttons */}
                          <div className="flex items-start gap-3.5 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-amber-400 via-[#FE2C55] to-purple-600 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-md">
                              {comment.user?.avatarUrl ? (
                                <img src={comment.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                              ) : (
                                comment.user?.displayName?.[0]?.toUpperCase() || 'U'
                              )}
                            </div>

                            <div className="space-y-1.5 flex-1 min-w-0">
                              <p className="text-xs font-bold text-white">
                                @{comment.user?.username || comment.user?.displayName || 'beecoolconsulting101'}
                              </p>
                              <p className="text-sm text-gray-200 leading-snug break-words">
                                {comment.content}
                              </p>

                              {/* Interaction sub-row matching Image 1: 1h ago | 💬 Reply | ♡ 0 | 🗑 Delete */}
                              <div className="flex items-center gap-4 text-xs text-gray-400 pt-1 font-semibold">
                                <span>{format(new Date(comment.createdAt), 'MMM d, h:mm a')}</span>
                                <button
                                  onClick={() => setReplyingCommentId(isReplying ? null : comment.id)}
                                  className="text-[#FE2C55] hover:underline font-bold flex items-center gap-1 transition-colors"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  Reply
                                </button>
                                <button
                                  onClick={() => toggleCommentLike(comment.id)}
                                  className={`flex items-center gap-1 transition-colors ${
                                    isLiked ? 'text-[#FE2C55]' : 'hover:text-white'
                                  }`}
                                >
                                  <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-[#FE2C55]' : ''}`} />
                                  {isLiked ? 1 : 0}
                                </button>
                                <button
                                  onClick={() => deleteCommentMutation.mutate(comment.id)}
                                  className="hover:text-red-400 flex items-center gap-1 transition-colors text-gray-500"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>

                              {/* Inline Quick Reply Input */}
                              {isReplying && (
                                <div className="mt-3 pt-2 border-t border-white/10 flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder={`Reply to @${comment.user?.displayName || 'user'}...`}
                                    className="flex-1 h-9 px-3 rounded-xl bg-zinc-950 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FE2C55]"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendReply(comment.id)}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSendReply(comment.id)}
                                    className="px-3.5 py-2 rounded-xl bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white font-bold text-xs flex items-center gap-1 transition-all"
                                  >
                                    <Send className="w-3 h-3" />
                                    Send
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Column: Linked Video Preview Card matching Image 1 */}
                          {comment.video && (
                            <div className="shrink-0 flex items-start gap-3 p-2.5 rounded-2xl bg-zinc-950 border border-white/10 max-w-xs">
                              {/* 9:16 Thumbnail */}
                              <div
                                onClick={() => navigate('video-detail', comment.video.id)}
                                className="relative w-14 aspect-[9/14] rounded-xl bg-zinc-800 border border-white/10 overflow-hidden shrink-0 cursor-pointer group shadow-md"
                              >
                                <div className="w-full h-full bg-gradient-to-b from-purple-900 via-rose-900 to-black flex items-center justify-center group-hover:scale-105 transition-transform">
                                  <Play className="w-4 h-4 text-white fill-white opacity-80" />
                                </div>
                                <span className="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-[7px] font-bold text-white">
                                  00:06
                                </span>
                              </div>

                              <div className="min-w-0 space-y-1">
                                <p
                                  onClick={() => navigate('video-detail', comment.video.id)}
                                  className="text-xs font-bold text-white hover:text-[#25F4EE] transition-colors cursor-pointer line-clamp-2 leading-tight"
                                >
                                  {comment.video.title}
                                </p>
                                <p className="text-[10px] text-gray-400 line-clamp-1">
                                  #socialmediahumor #marketinglife
                                </p>
                                <button
                                  onClick={() => {
                                    useAppStore.getState().setSelectedVideoId(comment.video.id)
                                    useAppStore.getState().setCommentPanelOpen(true)
                                  }}
                                  className="text-[11px] text-[#FE2C55] font-bold hover:underline block pt-0.5"
                                >
                                  Open all comments
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: ANALYTICS CONTENT (Video Posts / Trending Videos) */}
          {/* ======================================================== */}
          {activeTab === 'analytics-content' && (
            <div className="lg:col-span-9 space-y-6">
              <div className="rounded-3xl bg-zinc-950 border border-white/10 p-6 sm:p-8 space-y-6 shadow-xl">
                {/* Top Header with Download Data */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-white">Content</h1>
                    <p className="text-xs text-gray-400 mt-1">Track post views, engagement, and audience retention metrics</p>
                  </div>
                  <button
                    onClick={() => handleDownloadData('vidflow-content-analytics')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-white/15 hover:border-white/30 text-xs font-bold text-gray-200 transition-all self-start"
                  >
                    <Download className="w-3.5 h-3.5 text-[#FE2C55]" />
                    Download data
                  </button>
                </div>

                {/* Sub-tabs: Video Posts & Trending Videos */}
                <div className="flex items-center gap-8 border-b border-white/10 text-sm font-bold">
                  <button
                    onClick={() => setContentTab('video-posts')}
                    className={`pb-3 transition-colors relative ${
                      contentTab === 'video-posts' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Video Posts ⓘ
                  </button>
                  <button
                    onClick={() => setContentTab('trending')}
                    className={`pb-3 transition-colors relative ${
                      contentTab === 'trending' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Trending Videos ⓘ
                  </button>
                </div>

                {/* Post Count Summary */}
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">{data.recentVideos?.length || 0} posts</h3>
                  <p className="text-xs text-gray-400">Last 7 days vs. previous period</p>
                </div>

                {/* Videos Feed */}
                <div className="space-y-4">
                  {(data.recentVideos ?? []).map((video: any) => (
                    <div
                      key={video.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-zinc-900/70 border border-white/10 hover:border-white/20 transition-all gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          onClick={() => navigate('video-detail', video.id)}
                          className="relative w-16 aspect-[9/14] rounded-xl bg-zinc-800 border border-white/10 overflow-hidden shrink-0 cursor-pointer shadow-md"
                        >
                          <div className="w-full h-full bg-gradient-to-b from-purple-900 via-rose-900 to-black flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Play className="w-5 h-5 text-white fill-white opacity-80" />
                          </div>
                        </div>

                        <div className="space-y-1.5 min-w-0">
                          <h4
                            onClick={() => navigate('video-detail', video.id)}
                            className="text-sm font-bold text-white hover:text-[#25F4EE] cursor-pointer transition-colors line-clamp-2"
                          >
                            {video.title}
                          </h4>
                          <p className="text-xs text-gray-400">
                            #{video.genre.toLowerCase()} #vidflow #creator
                          </p>

                          <button
                            onClick={() => navigate('video-detail', video.id)}
                            className="text-xs font-bold text-[#FE2C55] hover:underline inline-block pt-1"
                          >
                            View Analytics
                          </button>

                          <div className="flex items-center gap-3.5 text-xs text-gray-400 font-semibold pt-1">
                            <span className="flex items-center gap-1 text-gray-200">
                              ▶ {(video.viewCount ?? 0).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              ❤️ {Math.floor((video.viewCount ?? 0) * 0.12)}
                            </span>
                            <span className="flex items-center gap-1">
                              💬 {Math.floor((video.viewCount ?? 0) * 0.04)}
                            </span>
                            <span className="flex items-center gap-1">
                              ↗ 0
                            </span>
                            <span className="flex items-center gap-1">
                              🔖 1
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap self-end sm:self-center">
                        {format(new Date(video.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: ANALYTICS FOLLOWERS (Matching Image 2: Total Followers) */}
          {/* ======================================================== */}
          {activeTab === 'analytics-followers' && (
            <div className="lg:col-span-9 space-y-6">
              {/* Total Followers Card with SVG Chart */}
              <div className="rounded-3xl bg-zinc-950 border border-white/10 p-6 sm:p-8 space-y-6 shadow-xl">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h1 className="text-2xl font-black text-white">Total followers</h1>
                  <button
                    onClick={() => handleDownloadData('vidflow-followers-analytics')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-white/15 hover:border-white/30 text-xs font-bold text-gray-200 transition-all self-start"
                  >
                    <Download className="w-3.5 h-3.5 text-[#FE2C55]" />
                    Download data
                  </button>
                </div>

                {/* Time Range Pills matching Image 2 */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <button
                    onClick={() => setFollowerTimeRange('7d')}
                    className={`px-4 py-2 rounded-full transition-all ${
                      followerTimeRange === '7d'
                        ? 'bg-zinc-800 text-white font-black shadow-md border border-white/20'
                        : 'bg-zinc-900/60 text-gray-400 hover:text-white border border-white/5'
                    }`}
                  >
                    Last 7 days
                  </button>
                  <button
                    onClick={() => setFollowerTimeRange('28d')}
                    className={`px-4 py-2 rounded-full transition-all ${
                      followerTimeRange === '28d'
                        ? 'bg-zinc-800 text-white font-black shadow-md border border-white/20'
                        : 'bg-zinc-900/60 text-gray-400 hover:text-white border border-white/5'
                    }`}
                  >
                    Last 28 days
                  </button>
                  <button
                    onClick={() => setFollowerTimeRange('60d')}
                    className={`px-4 py-2 rounded-full transition-all ${
                      followerTimeRange === '60d'
                        ? 'bg-zinc-800 text-white font-black shadow-md border border-white/20'
                        : 'bg-zinc-900/60 text-gray-400 hover:text-white border border-white/5'
                    }`}
                  >
                    Last 60 days
                  </button>
                  <button
                    onClick={() => setFollowerTimeRange('custom')}
                    className={`px-4 py-2 rounded-full flex items-center gap-1 transition-all ${
                      followerTimeRange === 'custom'
                        ? 'bg-zinc-800 text-white font-black shadow-md border border-white/20'
                        : 'bg-zinc-900/60 text-gray-400 hover:text-white border border-white/5'
                    }`}
                  >
                    Custom <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Big Metric Highlight */}
                <div className="space-y-1 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {followerCount.toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-gray-400">in total</span>
                    <Info className="w-4 h-4 text-gray-500" />
                  </div>
                  <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    ↑ +6 (0%) vs. Dec 26 - Jan 1
                  </p>
                </div>

                {/* Custom Interactive SVG Area Chart matching Image 2 */}
                <div className="relative w-full h-64 sm:h-72 pt-4">
                  {/* Y-axis guidelines & labels on the right */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] font-bold text-gray-500 text-right pr-2">
                    <div className="border-b border-white/5 pb-0.5 flex justify-between">
                      <span></span>
                      <span>{yTick1.toLocaleString()}</span>
                    </div>
                    <div className="border-b border-white/5 pb-0.5 flex justify-between">
                      <span></span>
                      <span>{yTick2.toLocaleString()}</span>
                    </div>
                    <div className="border-b border-white/5 pb-0.5 flex justify-between">
                      <span></span>
                      <span>{yTick3.toLocaleString()}</span>
                    </div>
                    <div className="border-b border-white/5 pb-0.5 flex justify-between">
                      <span></span>
                      <span>{yTick4.toLocaleString()}</span>
                    </div>
                    <div className="border-b border-white/5 pb-0.5 flex justify-between">
                      <span></span>
                      <span>0</span>
                    </div>
                  </div>

                  {/* SVG Line + Gradient Area */}
                  <div className="absolute inset-0 right-12 pb-6 pt-2">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 200">
                      <defs>
                        <linearGradient id="followerAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                          <stop offset="60%" stopColor="#0284c7" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Area Fill */}
                      <polygon
                        points="0,25 116,25 233,24 350,24 466,23 583,23 700,22 700,200 0,200"
                        fill="url(#followerAreaGrad)"
                      />

                      {/* Top Stroke Line */}
                      <polyline
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        points="0,25 116,25 233,24 350,24 466,23 583,23 700,22"
                      />

                      {/* Data point dots */}
                      {[0, 116, 233, 350, 466, 583, 700].map((x, idx) => (
                        <circle
                          key={x}
                          cx={x}
                          cy={25 - (idx >= 2 ? 1 : 0) - (idx >= 4 ? 1 : 0) - (idx === 6 ? 1 : 0)}
                          r="4"
                          className="fill-[#38bdf8] stroke-zinc-950 stroke-2 hover:r-6 cursor-pointer transition-all"
                        />
                      ))}
                    </svg>
                  </div>

                  {/* X-axis date labels */}
                  <div className="absolute bottom-0 inset-x-0 right-12 flex justify-between text-[11px] font-semibold text-gray-400">
                    {followerDataPoints.map((dp) => (
                      <span key={dp.date}>{dp.date}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3 Bottom Demographic Cards matching Image 2: Gender, Age, Country/region */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Gender Card with Donut Chart */}
                <div className="rounded-3xl bg-zinc-950 border border-white/10 p-6 space-y-4 shadow-xl">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-extrabold text-white">Gender</h3>
                    <Info className="w-3.5 h-3.5 text-gray-500" />
                  </div>

                  <div className="relative flex flex-col items-center justify-center py-4">
                    {/* SVG Donut Chart */}
                    <div className="relative w-36 h-36">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background / Female 79% */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#38bdf8"
                          strokeWidth="14"
                          strokeDasharray="238.76"
                          strokeDashoffset="50.14"
                        />
                        {/* Male 21% */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#0284c7"
                          strokeWidth="14"
                          strokeDasharray="50.14 238.76"
                          strokeDashoffset="0"
                        />
                      </svg>
                      {/* Inner Text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-black text-white">21%</span>
                        <span className="text-[10px] text-gray-400 font-bold">Male</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 mt-4 text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#0284c7]"></span>
                        <span className="text-gray-300">21% Male</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#38bdf8]"></span>
                        <span className="text-gray-300">79% Female</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Age Card with Vertical Bar Chart */}
                <div className="rounded-3xl bg-zinc-950 border border-white/10 p-6 space-y-4 shadow-xl">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-extrabold text-white">Age</h3>
                    <Info className="w-3.5 h-3.5 text-gray-500" />
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Bar Chart Container */}
                    <div className="h-36 flex items-end justify-between gap-3 px-2 border-b border-white/10 pb-2">
                      <div className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-300">38%</span>
                        <div className="w-full bg-[#38bdf8] rounded-t-lg transition-all" style={{ height: '76px' }} />
                        <span className="text-[10px] font-semibold text-gray-400">18-24</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-300">42%</span>
                        <div className="w-full bg-[#0284c7] rounded-t-lg transition-all" style={{ height: '84px' }} />
                        <span className="text-[10px] font-semibold text-gray-400">25-34</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-300">14%</span>
                        <div className="w-full bg-[#38bdf8]/60 rounded-t-lg transition-all" style={{ height: '28px' }} />
                        <span className="text-[10px] font-semibold text-gray-400">35-44</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-300">6%</span>
                        <div className="w-full bg-[#38bdf8]/40 rounded-t-lg transition-all" style={{ height: '12px' }} />
                        <span className="text-[10px] font-semibold text-gray-400">45+</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Country/Region Card with Progress Bars */}
                <div className="rounded-3xl bg-zinc-950 border border-white/10 p-6 space-y-4 shadow-xl">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-extrabold text-white">Country/region</h3>
                    <Info className="w-3.5 h-3.5 text-gray-500" />
                  </div>

                  <div className="space-y-3.5 pt-1 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between font-bold">
                        <span className="text-gray-300">United States</span>
                        <span className="text-white">67.6%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                        <div className="h-full rounded-full bg-[#38bdf8]" style={{ width: '67.6%' }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-bold">
                        <span className="text-gray-300">United Kingdom</span>
                        <span className="text-white">8.5%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                        <div className="h-full rounded-full bg-[#38bdf8]" style={{ width: '8.5%' }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-bold">
                        <span className="text-gray-300">Canada</span>
                        <span className="text-white">4.2%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                        <div className="h-full rounded-full bg-[#38bdf8]" style={{ width: '4.2%' }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-bold">
                        <span className="text-gray-300">Germany</span>
                        <span className="text-white">3.8%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                        <div className="h-full rounded-full bg-[#38bdf8]" style={{ width: '3.8%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Live Followers Table Section */}
              <div className="rounded-3xl bg-zinc-950 border border-white/10 p-6 sm:p-8 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#FE2C55]" />
                    <h3 className="text-lg font-black text-white">Recent Followers</h3>
                  </div>
                  <button
                    onClick={() => {
                      setFollowModalTab('followers')
                      setFollowModalOpen(true)
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-[#FE2C55] hover:underline transition-colors"
                  >
                    View all {liveFollowersData?.data?.length || followerCount} followers
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {liveFollowersData && liveFollowersData.data.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {liveFollowersData.data.slice(0, 6).map((follower) => {
                      const initial = follower.displayName?.[0]?.toUpperCase() || 'U'
                      return (
                        <div
                          key={follower.id}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 hover:border-white/15 transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="w-10 h-10 rounded-full p-[1px] bg-gradient-to-br from-[#FE2C55] to-orange-500 shrink-0 overflow-hidden shadow-md">
                              {follower.avatarUrl ? (
                                <img
                                  src={follower.avatarUrl}
                                  alt={follower.displayName}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center font-bold text-white text-xs">
                                  {initial}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate group-hover:text-[#FE2C55] transition-colors">
                                {follower.displayName}
                              </p>
                              <p className="text-[11px] text-gray-500 font-mono truncate">
                                @{follower.username || follower.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '')}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {follower.isFollowing ? (
                              <span className="text-[10px] font-bold text-[#25F4EE] bg-[#25F4EE]/10 px-2.5 py-1 rounded-lg border border-[#25F4EE]/20 flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                Friends
                              </span>
                            ) : (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await toggleFollowCreator(follower.id)
                                    queryClient.invalidateQueries({ queryKey: ['creator-followers'] })
                                    queryClient.invalidateQueries({ queryKey: ['creator-dashboard'] })
                                    toast.success(res.isFollowing ? `Followed back @${follower.displayName}` : `Unfollowed @${follower.displayName}`)
                                  } catch {
                                    toast.error('Failed to follow back')
                                  }
                                }}
                                className="text-[10px] font-bold text-white bg-[#FE2C55] hover:bg-[#FE2C55]/90 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                              >
                                Follow back
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500 text-xs">
                    No followers recorded yet. Share your videos to grow your audience!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: ANALYTICS - RATINGS & REVIEWS */}
          {/* ======================================================== */}
          {activeTab === 'analytics-ratings' && (
            <div className="lg:col-span-9 space-y-6">
              {/* Overview Score Card */}
              <div className="rounded-3xl bg-zinc-950 border border-white/10 p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
                      <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                      Ratings & Reviews
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">
                      Community feedback, star ratings distribution, and audience reviews for your channel.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadData('vidflow-ratings-analytics')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-white/15 hover:border-white/30 text-xs font-bold text-gray-200 transition-all self-start sm:self-auto hover:text-white"
                  >
                    <Download className="w-3.5 h-3.5 text-[#FE2C55]" />
                    Download report
                  </button>
                </div>

                {/* Big Score Block & Star Distribution Bars */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-6 rounded-2xl bg-zinc-900/60 border border-white/5">
                  {/* Left: Overall Rating Average */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-white/10">
                    <span className="text-6xl font-black text-white tracking-tight">
                      {ratingsData?.averageRating ? ratingsData.averageRating.toFixed(1) : '5.0'}
                    </span>
                    <div className="flex items-center gap-1 my-2.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.round(ratingsData?.averageRating || 5)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-zinc-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs font-bold text-gray-400">
                      Based on {ratingsData?.totalRatings || 0} reviews
                    </p>
                    <div className="mt-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      98% Positive Rating
                    </div>
                  </div>

                  {/* Right: Star Breakdown Progress Bars */}
                  <div className="md:col-span-8 space-y-2.5 px-2">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = ratingsData?.ratingBreakdown?.[stars as 1 | 2 | 3 | 4 | 5] || 0
                      const total = ratingsData?.totalRatings || 1
                      const pct = Math.round((count / (ratingsData?.totalRatings || 1)) * 100)
                      return (
                        <div key={stars} className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1 w-10 shrink-0 font-bold text-gray-300">
                            <span>{stars}</span>
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          </div>
                          <div className="flex-1 h-2.5 rounded-full bg-zinc-950 overflow-hidden border border-white/5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8 }}
                              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-[#FE2C55]"
                            />
                          </div>
                          <span className="w-16 text-right font-mono text-[11px] font-bold text-gray-400">
                            {count} ({pct}%)
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Reviews Management & Filter Card */}
              <div className="rounded-3xl bg-zinc-950 border border-white/10 p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-lg font-black text-white">
                    All Reviews ({filteredReviews.length})
                  </h2>

                  {/* Search & Filter Bar */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                      <input
                        type="text"
                        value={reviewSearch}
                        onChange={(e) => setReviewSearch(e.target.value)}
                        placeholder="Search reviews..."
                        className="pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FE2C55] w-44 sm:w-52"
                      />
                    </div>

                    {/* Star Filter Buttons */}
                    <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-white/10 text-xs">
                      <button
                        onClick={() => setRatingFilter('ALL')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          ratingFilter === 'ALL'
                            ? 'bg-zinc-800 text-white shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        All
                      </button>
                      {[5, 4, 3, 2, 1].map((s) => (
                        <button
                          key={s}
                          onClick={() => setRatingFilter(s)}
                          className={`px-2 py-1 rounded-lg font-bold flex items-center gap-0.5 transition-all ${
                            ratingFilter === s
                              ? 'bg-zinc-800 text-yellow-400 shadow-sm'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <span>{s}</span>
                          <Star className="w-2.5 h-2.5 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reviews List */}
                {filteredReviews.length > 0 ? (
                  <div className="space-y-3">
                    {filteredReviews.map((rev: any) => {
                      const initial = rev.user?.displayName?.[0]?.toUpperCase() || 'U'
                      return (
                        <div
                          key={rev.id}
                          className="p-5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 hover:border-white/15 transition-all space-y-3 group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full p-[1px] bg-gradient-to-br from-[#FE2C55] to-orange-500 shrink-0 overflow-hidden shadow-md">
                                {rev.user?.avatarUrl ? (
                                  <img
                                    src={rev.user.avatarUrl}
                                    alt={rev.user.displayName}
                                    className="w-full h-full object-cover rounded-full"
                                  />
                                ) : (
                                  <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center font-bold text-white text-xs">
                                    {initial}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white leading-tight">
                                  {rev.user?.displayName || 'User'}
                                </p>
                                <p className="text-[11px] text-gray-500 font-mono">
                                  @{rev.user?.username || rev.user?.displayName?.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user'}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3.5 h-3.5 ${
                                      s <= rev.rating
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-zinc-800'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] text-gray-500 font-medium">
                                {new Date(rev.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Tags */}
                          {rev.tags && rev.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {rev.tags.map((t: string) => (
                                <span
                                  key={t}
                                  className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-gray-300"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Review Text */}
                          {rev.review ? (
                            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed pt-1">
                              {rev.review}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500 italic">No written comment provided.</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-500 text-xs flex flex-col items-center justify-center gap-2">
                    <Star className="w-8 h-8 text-zinc-700" />
                    <p className="font-semibold text-gray-400">No ratings or reviews match your filter</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Follow / Following Modal */}
      {user && (
        <FollowListModal
          isOpen={followModalOpen}
          onClose={() => setFollowModalOpen(false)}
          userId={user.id}
          title="Creator Studio Network"
          initialTab={followModalTab}
        />
      )}
    </div>
  )
}
