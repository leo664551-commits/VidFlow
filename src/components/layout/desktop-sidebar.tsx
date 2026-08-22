'use client'

import { useState } from 'react'
import {
  Home,
  Compass,
  PlusSquare,
  Bell,
  User,
  Shield,
  Film,
  Search,
  LogOut,
  Flame,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { useQuery } from '@tanstack/react-query'
import { logout, getNotifications } from '@/lib/api'
import type { AppView } from '@/types'
import { UserAvatar } from '@/components/common/user-avatar'

export function DesktopSidebar() {
  const { user, currentView, navigate, setUser } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')

  const { data: notifsData } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => getNotifications({ page: 1, limit: 1 }),
    enabled: !!user,
  })
  const unreadCount = notifsData?.unreadCount || 0

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      useAppStore.getState().setSearchQuery(searchQuery.trim())
      navigate('discover')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setUser(null)
      navigate('login')
    } catch {
      // ignore
    }
  }

  const navItems: {
    label: string
    view: AppView
    icon: React.ComponentType<{ className?: string }>
    badge?: string
    roles?: string[]
  }[] = [
    { label: 'For You', view: 'feed', icon: Home },
    { label: 'Explore', view: 'discover', icon: Compass },
    { label: 'Notifications', view: 'notifications', icon: Bell },
    { label: 'Profile', view: 'profile', icon: User },
  ]

  return (
    <aside className="hidden md:flex flex-col w-60 lg:w-64 h-screen fixed left-0 top-0 bottom-0 bg-black border-r border-white/10 z-30 select-none overflow-y-auto scrollbar-none">
      {/* Brand Logo */}
      <div className="px-5 py-4 flex items-center gap-2 cursor-pointer" onClick={() => navigate('feed')}>
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5E70FF] to-[#24BBA9] shadow-lg shadow-[#5E70FF]/20">
          <Flame className="w-5 h-5 text-white fill-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight text-white flex items-center gap-1">
            Vid<span className="text-[#5E70FF]">Flow</span>
          </span>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="px-4 py-2">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos..."
            className="w-full h-10 pl-10 pr-4 rounded-full bg-white/10 border border-white/10 text-white placeholder-gray-400 text-sm focus:outline-none focus:border-[#5E70FF] focus:bg-white/15 transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
        </form>
      </div>

      {/* Main Navigation Links */}
      <nav className="px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.view
          const isNotifs = item.view === 'notifications'
          return (
            <button
              key={item.view}
              onClick={() => navigate(item.view)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold text-base transition-all ${
                isActive
                  ? 'text-[#5E70FF] bg-[#5E70FF]/15 border border-[#5E70FF]/30 shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'text-[#5E70FF]' : 'text-gray-400'}`} />
              <span>{item.label}</span>
              {isNotifs && unreadCount > 0 && (
                <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-[#5E70FF] text-white rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )
        })}

        {/* Creator Upload / Studio */}
        {user?.role === 'CREATOR' && (
          <>
            <div className="pt-2 pb-1 px-4">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Creator</span>
            </div>
            <button
              onClick={() => navigate('creator-upload')}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                currentView === 'creator-upload'
                  ? 'text-[#5E70FF] bg-[#5E70FF]/15 border border-[#5E70FF]/30'
                  : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <PlusSquare className="w-5 h-5 text-gray-400" />
              <span>Upload Video</span>
            </button>
            <button
              onClick={() => navigate('creator-dashboard')}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                currentView === 'creator-dashboard' || currentView === 'creator-videos'
                  ? 'text-[#5E70FF] bg-[#5E70FF]/15 border border-[#5E70FF]/30'
                  : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Film className="w-5 h-5 text-gray-400" />
              <span>Creator Studio</span>
            </button>
          </>
        )}

        {/* Admin Dashboard */}
        {user?.role === 'ADMIN' && (
          <>
            <div className="pt-2 pb-1 px-4">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Administration</span>
            </div>
            <button
              onClick={() => navigate('admin-dashboard')}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                currentView.startsWith('admin-')
                  ? 'text-[#5E70FF] bg-white/10'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-5 h-5 text-[#24BBA9]" />
              <span>Admin Portal</span>
            </button>
          </>
        )}
      </nav>

      {/* User Info / Logout at bottom */}
      <div className="mt-auto p-4 border-t border-white/10">
        {user ? (
          <div className="flex items-center gap-2.5 px-1 py-1">
            <button
              onClick={() => navigate('profile')}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left group hover:opacity-90 transition-opacity"
              title="View Profile"
            >
              <UserAvatar
                src={user.avatarUrl}
                name={user.displayName || user.email}
                size="md"
                role={user.role}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold text-white truncate group-hover:text-[#5E70FF] transition-colors"
                  title={user.displayName || user.email}
                >
                  {user.displayName || user.email}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#5E70FF]/15 text-[#5E70FF] border border-[#5E70FF]/30 uppercase">
                    {user.role}
                  </span>
                  {user.username && (
                    <span className="text-[10px] text-gray-500 font-mono truncate">
                      @{user.username}
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Sign Out Icon with Hover Tooltip */}
            <div className="relative group shrink-0">
              <button
                onClick={handleLogout}
                aria-label="Sign Out"
                title="Sign Out"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#DF4D50] hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Hover Tooltip Bubble */}
              <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover:flex items-center justify-center whitespace-nowrap rounded-md bg-zinc-900 border border-white/15 px-2.5 py-1 text-xs font-semibold text-white shadow-xl z-50">
                Sign Out
                <div className="absolute top-full right-2.5 -mt-px border-4 border-transparent border-t-zinc-900" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 px-1">Log in to like videos, leave comments, and follow creators.</p>
            <button
              onClick={() => navigate('login')}
              className="w-full py-2.5 rounded-xl bg-[#5E70FF] hover:bg-[#4D5FE8] text-white font-bold text-sm shadow-lg shadow-[#5E70FF]/30 transition-all"
            >
              Log in
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-gray-600 space-y-1">
          <p>© 2026 VidFlow • Social Platform</p>
        </div>
      </div>
    </aside>
  )
}
