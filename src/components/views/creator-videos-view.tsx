'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Upload,
  Home,
  Film,
  MessageSquare,
  BarChart3,
  HelpCircle,
  Play,
  Trash2,
  Eye,
  ChevronDown,
  Globe,
  Search,
} from 'lucide-react'
import { getCreatorVideos, deleteVideo } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { TableSkeleton } from '@/components/common/loading-skeleton'
import { PaginationControls } from '@/components/common/pagination-controls'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { VideoStatus } from '@/types'

export function CreatorVideosView() {
  const { user, navigate, goBack } = useAppStore()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<VideoStatus | 'ALL'>('ALL')
  const [searchFilter, setSearchFilter] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['creator-videos', user?.id, page, status],
    queryFn: () =>
      getCreatorVideos({
        page,
        limit: 10,
        status: status === 'ALL' ? undefined : status,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => {
      setDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ['creator-videos'] })
      queryClient.invalidateQueries({ queryKey: ['creator-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['creator-my-videos'] })
      queryClient.invalidateQueries({ queryKey: ['user-me'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      toast.success('Video deleted successfully')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    },
  })

  const videos = data?.data ?? []
  const filteredVideos = searchFilter.trim()
    ? videos.filter((v) => v.title.toLowerCase().includes(searchFilter.toLowerCase()))
    : videos

  return (
    <div className="h-full w-full overflow-y-auto bg-black text-white pb-32 select-none scrollbar-thin scrollbar-thumb-zinc-800 scroll-smooth">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goBack('creator-dashboard')}
            className="p-2 -ml-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight text-white flex items-center gap-1">
              Vid<span className="text-[#5E70FF]">Flow</span>
            </span>
            <span className="text-base font-bold text-gray-300">Creator Center</span>
            <span className="px-2 py-0.5 rounded-md bg-[#5E70FF]/20 text-[#5E70FF] text-[10px] font-black uppercase tracking-wider border border-[#5E70FF]/30">
              Studio
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('creator-upload')}
          className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-xl bg-[#5E70FF] hover:bg-[#4D5FE8] text-white font-bold text-sm shadow-lg shadow-[#5E70FF]/20 transition-all hover:scale-[1.02]"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Navigation Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            <button
              onClick={() => navigate('creator-upload')}
              className="w-full py-3.5 rounded-2xl bg-[#5E70FF] hover:bg-[#4D5FE8] text-white font-bold text-base shadow-xl shadow-[#5E70FF]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <Upload className="w-5 h-5" />
              Upload
            </button>

            <div className="rounded-3xl bg-zinc-950 border border-white/10 p-3 space-y-1">
              <button
                onClick={() => navigate('creator-dashboard')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <Home className="w-5 h-5" />
                <span>Home</span>
              </button>

              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm bg-[#5E70FF]/15 text-[#5E70FF] border border-[#5E70FF]/30"
              >
                <Film className="w-5 h-5" />
                <span>Posts</span>
              </button>

              <button
                onClick={() => navigate('creator-dashboard')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
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
                  <button onClick={() => navigate('creator-dashboard')} className="w-full text-left py-1.5 px-3 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-colors">
                    Key metrics
                  </button>
                  <button className="w-full text-left py-1.5 px-3 rounded-lg text-xs font-semibold text-[#5E70FF] bg-[#5E70FF]/10">
                    Content
                  </button>
                  <button onClick={() => navigate('profile')} className="w-full text-left py-1.5 px-3 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-colors">
                    Followers
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Main Table Content: Manage your posts */}
          <div className="lg:col-span-9 space-y-6">
            <div className="rounded-3xl bg-zinc-950 border border-white/10 p-6 sm:p-8 space-y-6 shadow-xl">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-white">Manage your posts</h1>
                  <p className="text-xs text-gray-400 mt-1">View, manage, and analyze your published video content</p>
                </div>

                {/* Search in Posts */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search posts..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#5E70FF]"
                  />
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                </div>
              </div>

              {/* Posts Table List */}
              {isLoading ? (
                <TableSkeleton />
              ) : filteredVideos.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <Film className="w-12 h-12 text-zinc-600 mx-auto" />
                  <h3 className="text-base font-bold text-white">No posts found</h3>
                  <p className="text-xs text-gray-400">You haven&apos;t uploaded any videos matching this filter yet.</p>
                  <button
                    onClick={() => navigate('creator-upload')}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-[#5E70FF] hover:bg-[#4D5FE8] text-white font-bold text-xs shadow-lg shadow-[#5E70FF]/25 transition-all"
                  >
                    Upload your first video
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="pb-3 pr-4">Posts</th>
                        <th className="pb-3 px-4 text-center">Actions</th>
                        <th className="pb-3 px-4">Status</th>
                        <th className="pb-3 pl-4">Privacy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredVideos.map((video) => (
                        <tr key={video.id} className="hover:bg-white/[0.02] transition-colors group">
                          {/* Posts Column: Thumbnail + Title + Engagement */}
                          <td className="py-4 pr-4">
                            <div className="flex items-start gap-3.5 max-w-md">
                              {/* 9:16 Thumbnail */}
                              <div
                                onClick={() => navigate('video-detail', video.id)}
                                className="relative w-16 aspect-[9/14] rounded-xl bg-zinc-800 border border-white/10 overflow-hidden shrink-0 cursor-pointer shadow-md"
                              >
                                <div className="w-full h-full bg-gradient-to-b from-purple-900 via-rose-900 to-black flex items-center justify-center group-hover:scale-105 transition-transform">
                                  <Play className="w-5 h-5 text-white fill-white opacity-80" />
                                </div>
                                {video.duration && (
                                  <span className="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-[8px] font-bold text-white">
                                    00:{String(video.duration).padStart(2, '0')}
                                  </span>
                                )}
                              </div>

                              {/* Title + Hashtags + Engagement Metrics Row */}
                              <div className="flex-1 min-w-0">
                                <h4
                                  onClick={() => navigate('video-detail', video.id)}
                                  className="text-sm font-bold text-white group-hover:text-[#24BBA9] transition-colors cursor-pointer line-clamp-2 leading-snug"
                                >
                                  {video.title}
                                </h4>
                                <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                                  #{video.genre.toLowerCase()} #viral #trending
                                </p>

                                {/* Engagement Counts */}
                                <div className="flex items-center gap-3.5 mt-2 text-[11px] text-gray-400 font-medium">
                                  <span className="flex items-center gap-1 text-gray-300">
                                    ▶ {(video.viewCount ?? 0).toLocaleString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    ❤️ {(video.likeCount ?? 0).toLocaleString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    💬 {(video.commentCount ?? 0).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Actions Column: Edit, Comments, Delete */}
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => navigate('video-detail', video.id)}
                                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="View Video Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  useAppStore.getState().setSelectedVideoId(video.id)
                                  useAppStore.getState().setCommentPanelOpen(true)
                                }}
                                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="Open Comments"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteId(video.id)}
                                className="p-2 rounded-xl text-gray-400 hover:text-[#DF4D50] hover:bg-[#DF4D50]/10 transition-colors"
                                title="Delete Video"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>

                          {/* Status Column */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#48B321]/15 text-[#48B321] border border-[#48B321]/30">
                                Posted
                              </span>
                              <p className="text-[11px] text-gray-400">
                                {format(new Date(video.createdAt), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                          </td>

                          {/* Privacy Column */}
                          <td className="py-4 pl-4 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-semibold text-gray-300">
                              <Globe className="w-3.5 h-3.5 text-gray-400" />
                              <span>Everyone</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="pt-4 border-t border-white/10">
                  <PaginationControls
                    page={page}
                    totalPages={data.pagination.totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full rounded-3xl bg-zinc-900 border border-white/15 p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Delete Video</h3>
            <p className="text-xs text-gray-400">
              Are you sure you want to delete this video? This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-all shadow-lg shadow-red-600/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
