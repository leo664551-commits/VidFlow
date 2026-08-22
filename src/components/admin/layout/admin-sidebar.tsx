'use client'

import { useAppStore } from '@/store/app-store'
import { useQuery } from '@tanstack/react-query'
import { getAdminCreatorApplications, logout } from '@/lib/api'
import { toast } from 'sonner'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserPlus,
  Video,
  MessageSquare,
  ShieldAlert,
  BarChart3,
  ScrollText,
  Sliders,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react'
import type { AppView } from '@/types'

interface AdminSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

interface NavItem {
  label: string
  view: AppView
  icon: typeof LayoutDashboard
  badgeCount?: number
  badgeColor?: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

export function AdminSidebar({ collapsed, onToggleCollapse }: AdminSidebarProps) {
  const currentView = useAppStore((s) => s.currentView)
  const navigate = useAppStore((s) => s.navigate)
  const user = useAppStore((s) => s.user)
  const clearUser = useAppStore((s) => s.clearUser)

  const handleLogout = async () => {
    try {
      await logout()
      clearUser()
      toast.success('Signed out of Admin Console')
      navigate('login')
    } catch {
      clearUser()
      navigate('login')
    }
  }

  // Live count for pending creator applications
  const { data: pendingAppsData } = useQuery({
    queryKey: ['admin-creator-applications-count', user?.id],
    queryFn: () => getAdminCreatorApplications({ status: 'PENDING', limit: 1 }),
    enabled: !!user && user.role === 'ADMIN',
    refetchInterval: 15000,
  })

  const pendingAppsCount = pendingAppsData?.pagination?.total ?? 0

  const navGroups: NavGroup[] = [
    {
      title: 'OVERVIEW',
      items: [
        {
          label: 'Executive Dashboard',
          view: 'admin-dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'USER & CREATOR OPS',
      items: [
        {
          label: 'User Directory',
          view: 'admin-users',
          icon: Users,
        },
        {
          label: 'Creator Applications',
          view: 'admin-applications',
          icon: UserCheck,
          badgeCount: pendingAppsCount,
          badgeColor: 'bg-amber-500 text-black animate-pulse',
        },
        {
          label: 'Creators Catalog',
          view: 'admin-creators',
          icon: UserPlus,
        },
      ],
    },
    {
      title: 'CONTENT & TRUST',
      items: [
        {
          label: 'Video Moderation',
          view: 'admin-videos',
          icon: Video,
        },
        {
          label: 'Comment Moderation',
          view: 'admin-comments',
          icon: MessageSquare,
        },
        {
          label: 'Moderation Queue',
          view: 'admin-moderation',
          icon: ShieldAlert,
        },
      ],
    },
    {
      title: 'INTELLIGENCE & AUDIT',
      items: [
        {
          label: 'Platform Analytics',
          view: 'admin-analytics',
          icon: BarChart3,
        },
        {
          label: 'Audit Log Trail',
          view: 'admin-audit-logs',
          icon: ScrollText,
        },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        {
          label: 'Platform Settings',
          view: 'admin-system',
          icon: Sliders,
        },
      ],
    },
  ]

  return (
    <aside
      className={`h-full bg-zinc-950 border-r border-zinc-800/80 flex flex-col transition-all duration-300 select-none z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Platform Branding Header */}
      <div className="h-16 px-4 border-b border-zinc-800/80 flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#5E70FF] to-[#24BBA9] flex items-center justify-center shadow-lg shadow-[#5E70FF]/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-black text-sm tracking-tight text-white">
                <span>Vid<span className="text-[#5E70FF]">Flow</span></span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#5E70FF]/20 text-[#5E70FF] border border-[#5E70FF]/30">
                  CONTROL
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#48B321] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#48B321] animate-pulse" />
                SYSTEM ONLINE
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#5E70FF] to-[#24BBA9] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex w-7 h-7 rounded-md items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Group Items */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.view
              return (
                <button
                  key={item.view}
                  onClick={() => navigate(item.view)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all text-left group relative ${
                    isActive
                      ? 'bg-[#5E70FF]/15 text-[#5E70FF] border border-[#5E70FF]/30 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#5E70FF]' : 'text-zinc-400 group-hover:text-white'
                    }`}
                  />
                  {!collapsed && <span className="truncate flex-1">{item.label}</span>}

                  {/* Badge */}
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        item.badgeColor || 'bg-[#5E70FF] text-white'
                      } ${collapsed ? 'absolute top-1 right-1' : ''}`}
                    >
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer: Admin Account Info & Sign Out */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80 space-y-2">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
            <div className="w-7 h-7 rounded-full bg-[#5E70FF]/20 text-[#5E70FF] border border-[#5E70FF]/40 flex items-center justify-center font-bold text-xs">
              {user.displayName?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user.displayName || user.email}</p>
              <p className="text-[10px] text-zinc-400 font-mono">ROLE: ADMIN</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#DF4D50]/10 hover:bg-[#DF4D50]/20 border border-[#DF4D50]/20 text-[#DF4D50] font-medium text-xs transition-all"
          title="Sign out of Admin Console"
        >
          <LogOut className="w-3.5 h-3.5 text-[#DF4D50]" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
