'use client'

import { Home, Search, PlusCircle, Bell, User, Shield } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
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

  const role = user?.role

  const tabs: TabItem[] = [
    { icon: <Home className="h-6 w-6" />, label: 'Home', view: 'feed' },
    { icon: <Search className="h-6 w-6" />, label: 'Discover', view: 'discover' },
    ...(role === 'CREATOR'
      ? [{ icon: <PlusCircle className="h-7 w-7" />, label: '', view: 'creator-upload' as AppView, roles: ['CREATOR'] }]
      : []),
    { icon: <Bell className="h-6 w-6" />, label: 'Inbox', view: 'notifications' },
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
              active ? 'text-white' : 'text-gray-500'
            }`}
          >
            {tab.view === 'creator-upload' ? (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
                <PlusCircle className="h-7 w-7 text-black" />
              </div>
            ) : (
              tab.icon
            )}
            {tab.label && (
              <span className="text-[10px]">{tab.label}</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
