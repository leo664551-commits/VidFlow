'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/app-store'
import { Search, Bell, Shield, ArrowUpRight, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminGlobalSearchModal } from './admin-global-search-modal'
import type { AppView } from '@/types'

interface AdminTopbarProps {
  onOpenMobileSidebar: () => void
}

const VIEW_TITLES: Record<string, { category: string; title: string }> = {
  'admin-dashboard': { category: 'OVERVIEW', title: 'Executive Command Center' },
  'admin-users': { category: 'USER OPS', title: 'User Management & Directory' },
  'admin-applications': { category: 'CREATOR OPS', title: 'Creator Applications Queue' },
  'admin-creators': { category: 'CREATOR OPS', title: 'Approved Creators Catalog' },
  'admin-creator-new': { category: 'CREATOR OPS', title: 'Manual Creator Creation' },
  'admin-videos': { category: 'CONTENT', title: 'Video Moderation & Catalog' },
  'admin-comments': { category: 'CONTENT', title: 'Comment Moderation' },
  'admin-moderation': { category: 'TRUST & SAFETY', title: 'Priority Moderation Queue' },
  'admin-audit-logs': { category: 'INTELLIGENCE', title: 'System Audit Logs' },
  'admin-analytics': { category: 'INTELLIGENCE', title: 'Platform Growth & Analytics' },
  'admin-system': { category: 'SYSTEM', title: 'Platform Settings & Policies' },
}

export function AdminTopbar({ onOpenMobileSidebar }: AdminTopbarProps) {
  const currentView = useAppStore((s) => s.currentView)
  const navigate = useAppStore((s) => s.navigate)
  const [searchOpen, setSearchOpen] = useState(false)

  const meta = VIEW_TITLES[currentView] || { category: 'ADMIN', title: 'Admin Control Center' }

  return (
    <>
      <header className="h-16 px-6 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between z-20 select-none">
        {/* Left: Mobile Menu Trigger + Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <span>ADMIN</span>
              <span>/</span>
              <span className="text-cyan-400">{meta.category}</span>
            </div>
            <h1 className="text-base font-bold text-white leading-tight">{meta.title}</h1>
          </div>
        </div>

        {/* Center: Command Palette Trigger Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-all shadow-inner group"
          >
            <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
            <span className="hidden sm:inline">Search platform entities...</span>
            <span className="inline sm:hidden">Search...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 border border-zinc-700/60 text-zinc-400">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Quick Action Shortcuts & Notifications */}
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => navigate('admin-applications')}
            size="sm"
            variant="outline"
            className="hidden sm:flex items-center gap-1.5 h-8 text-xs bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
          >
            <span>Review Applications</span>
            <ArrowUpRight className="w-3 h-3" />
          </Button>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          <button
            onClick={() => navigate('admin-moderation')}
            className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            title="Moderation Center"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400" />
          </button>
        </div>
      </header>

      {/* Global Search Modal */}
      <AdminGlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
