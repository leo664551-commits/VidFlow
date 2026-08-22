'use client'

import { Home, Search, PlusCircle, Bell, User, Shield } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { useQuery } from '@tanstack/react-query'
import { getNotifications } from '@/lib/api'
import type { AppView } from '@/types'
import { UserAvatar } from '@/components/common/user-avatar'

interface TabItem {
  icon: React.ReactNode
  label: string
  view: AppView
  roles?: string[]
}

export function BottomTabBar() {
  const { user, navigate, currentView } = useAppStore()

  const { data: notifsData } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => getNotifications({ page: 1, limit: 1 }),
    enabled: !!user,
  })
  const unreadCount = notifsData?.unreadCount || 0

  const role = user?.role

  const tabs: TabItem[] = [
    { icon: <Home className="h-6 w-6" />, label: 'Home', view: 'feed' },
    { icon: <Search className="h-6 w-6" />, label: 'Discover', view: 'discover' },
    ...(role === 'CREATOR'
      ? [{ icon: <PlusCircle className="h-7 w-7" />, label: '', view: 'creator-upload' as AppView, roles: ['CREATOR'] }]
      : []),
    ...(role === 'ADMIN'
      ? [{ icon: <Shield className="h-6 w-6 text-[#24BBA9]" />, label: 'Admin', view: 'admin-dashboard' as AppView, roles: ['ADMIN'] }]
      : []),
    {
      icon: (
        <div className="relative">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#5E70FF] ring-2 ring-black" />
          )}
        </div>
      ),
      label: 'Notifications',
      view: 'notifications',
    },
    {
      icon: user?.avatarUrl ? (
        <UserAvatar
          src={user.avatarUrl}
          name={user.displayName || user.email}
          size="xs"
        />
      ) : (
        <User className="h-6 w-6" />
      ),
      label: 'Profile',
      view: 'profile',
    },
  ]

  const isActive = (view: AppView) => {
    if (view === 'feed' && currentView === 'feed') return true
    if (view === 'discover' && currentView === 'discover') return true
    if (view === 'notifications' && currentView === 'notifications') return true
    if (view === 'profile' && currentView === 'profile') return true
    if (view === 'admin-dashboard' && currentView.startsWith('admin-')) return true
    return false
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 bg-black/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const active = isActive(tab.view)
        return (
          <button
            key={tab.view}
            onClick={() => navigate(tab.view)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 transition-colors ${
              active ? 'text-[#5E70FF]' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.view === 'creator-upload' ? (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#5E70FF] shadow-lg shadow-[#5E70FF]/30">
                <PlusCircle className="h-7 w-7 text-white" />
              </div>
            ) : (
              tab.icon
            )}
            {tab.label && (
              <span className={`text-[10px] font-semibold ${active ? 'text-[#5E70FF]' : 'text-gray-400'}`}>{tab.label}</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
