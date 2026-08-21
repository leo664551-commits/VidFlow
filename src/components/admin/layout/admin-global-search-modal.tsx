'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/store/app-store'
import { getAdminUsers, getAdminVideos, getAdminCreators, getAdminCreatorApplications } from '@/lib/api'
import { Search, Users, Video, UserPlus, FileText, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { AdminStatusBadge } from '../ui/admin-status-badge'
import type { AppView } from '@/types'

interface AdminGlobalSearchModalProps {
  open: boolean
  onClose: () => void
}

export function AdminGlobalSearchModal({ open, onClose }: AdminGlobalSearchModalProps) {
  const [query, setQuery] = useState('')
  const navigate = useAppStore((s) => s.navigate)

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (open) onClose()
        else setQuery('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Queries for multi-entity search
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-search-users', query],
    queryFn: () => getAdminUsers({ search: query, limit: 3 }),
    enabled: query.length >= 2,
  })

  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ['admin-search-videos', query],
    queryFn: () => getAdminVideos({ search: query, limit: 3 }),
    enabled: query.length >= 2,
  })

  const { data: creatorsData, isLoading: creatorsLoading } = useQuery({
    queryKey: ['admin-search-creators', query],
    queryFn: () => getAdminCreators({ search: query, limit: 3 }),
    enabled: query.length >= 2,
  })

  const handleSelect = (view: AppView) => {
    navigate(view)
    onClose()
  }

  const isLoading = usersLoading || videosLoading || creatorsLoading

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 border-b border-zinc-800 flex flex-row items-center gap-3">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, creators, videos, applications... (Press ESC to exit)"
            className="border-0 bg-transparent text-white placeholder-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-base h-9 p-0"
            autoFocus
          />
          {isLoading && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />}
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
          {query.trim().length < 2 ? (
            <div className="py-8 text-center text-zinc-500 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-sm font-medium">Type at least 2 characters to search across platform data</p>
              <div className="flex justify-center gap-2 pt-2">
                <span className="text-xs px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-400">Users</span>
                <span className="text-xs px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-400">Creators</span>
                <span className="text-xs px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-400">Videos</span>
              </div>
            </div>
          ) : (
            <>
              {/* Users Results */}
              {usersData && usersData.data.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    Users
                  </h4>
                  <div className="space-y-1.5">
                    {usersData.data.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSelect('admin-users')}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 transition-colors text-left group"
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-white">
                            {u.displayName?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">
                              {u.displayName || u.email}
                            </p>
                            <p className="text-xs text-zinc-400">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <AdminStatusBadge status={u.role} />
                          <AdminStatusBadge status={u.status} />
                          <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Creators Results */}
              {creatorsData && creatorsData.data.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-2">
                    <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                    Creators
                  </h4>
                  <div className="space-y-1.5">
                    {creatorsData.data.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelect('admin-creators')}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 transition-colors text-left group"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">
                            @{c.creatorName}
                          </p>
                          <p className="text-xs text-zinc-400">{c.user.email} • {c.videoCount} videos</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos Results */}
              {videosData && videosData.data.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-violet-400" />
                    Videos
                  </h4>
                  <div className="space-y-1.5">
                    {videosData.data.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => handleSelect('admin-videos')}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 transition-colors text-left group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-violet-400 transition-colors">
                            {v.title}
                          </p>
                          <p className="text-xs text-zinc-400">By @{v.creator.creatorName} • {v.genre}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <AdminStatusBadge status={v.status} />
                          <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {!isLoading &&
                usersData?.data.length === 0 &&
                creatorsData?.data.length === 0 &&
                videosData?.data.length === 0 && (
                  <div className="py-12 text-center text-zinc-500">
                    <p className="text-sm font-medium">No results found for &ldquo;{query}&rdquo;</p>
                  </div>
                )}
            </>
          )}
        </div>

        <div className="p-3 border-t border-zinc-800 bg-zinc-900/40 text-[11px] text-zinc-500 flex items-center justify-between">
          <span>Quick search powered by VidFlow Admin Intelligence</span>
          <span>Press ESC to close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
