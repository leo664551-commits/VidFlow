'use client'

import { useEffect, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from '@/components/ui/sonner'
import { BottomTabBar } from '@/components/layout/bottom-tab-bar'
import { DesktopSidebar } from '@/components/layout/desktop-sidebar'
import { useAppStore } from '@/store/app-store'
import { getAuthUser } from '@/lib/api'
import { LandingView } from '@/components/views/landing-view'
import { LoginView } from '@/components/views/login-view'
import { RegisterView } from '@/components/views/register-view'
import { FeedView } from '@/components/views/feed-view'
import { DiscoverView } from '@/components/views/discover-view'
import { NotificationsView } from '@/components/views/notifications-view'
import { ProfileView } from '@/components/views/profile-view'
import { CreatorProfileView } from '@/components/views/creator-profile-view'
import { VideoDetailView } from '@/components/views/video-detail-view'
import { CommentPanel } from '@/components/feed/comment-panel'
import { CreatorDashboardView } from '@/components/views/creator-dashboard-view'
import { CreatorVideosView } from '@/components/views/creator-videos-view'
import { CreatorUploadView } from '@/components/views/creator-upload-view'
import { CreatorEditVideoView } from '@/components/views/creator-edit-video-view'
import { AdminDashboardView } from '@/components/views/admin-dashboard-view'
import { AdminApplicationsView } from '@/components/views/admin-applications-view'
import { AdminCreatorsView } from '@/components/views/admin-creators-view'
import { AdminCreatorNewView } from '@/components/views/admin-creator-new-view'
import { AdminUsersView } from '@/components/views/admin-users-view'
import { AdminVideosView } from '@/components/views/admin-videos-view'
import { AdminCommentsView } from '@/components/views/admin-comments-view'
import { AdminModerationView } from '@/components/views/admin-moderation-view'
import { AdminAuditLogsView } from '@/components/views/admin-audit-logs-view'
import { AdminAnalyticsView } from '@/components/views/admin-analytics-view'
import { AdminSystemView } from '@/components/views/admin-system-view'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000, retry: 1 },
  },
})

const AUTH_VIEWS = new Set(['landing', 'login', 'register'])
const DASHBOARD_VIEWS = new Set([
  'creator-dashboard', 'creator-videos', 'creator-upload', 'creator-edit-video',
  'admin-dashboard', 'admin-applications', 'admin-creators', 'admin-creator-new',
  'admin-users', 'admin-videos', 'admin-comments', 'admin-moderation',
  'admin-audit-logs', 'admin-analytics', 'admin-system',
])

function ViewRouter() {
  const currentView = useAppStore((s) => s.currentView)

  const views: Record<string, React.ReactNode> = {
    landing: <LandingView />,
    login: <LoginView />,
    register: <RegisterView />,
    feed: <FeedView />,
    discover: <DiscoverView />,
    notifications: <NotificationsView />,
    profile: <ProfileView />,
    'creator-profile': <CreatorProfileView />,
    'video-detail': <VideoDetailView />,
    'creator-dashboard': <CreatorDashboardView />,
    'creator-videos': <CreatorVideosView />,
    'creator-upload': <CreatorUploadView />,
    'creator-edit-video': <CreatorEditVideoView />,
    'admin-dashboard': <AdminDashboardView />,
    'admin-applications': <AdminApplicationsView />,
    'admin-creators': <AdminCreatorsView />,
    'admin-creator-new': <AdminCreatorNewView />,
    'admin-users': <AdminUsersView />,
    'admin-videos': <AdminVideosView />,
    'admin-comments': <AdminCommentsView />,
    'admin-moderation': <AdminModerationView />,
    'admin-audit-logs': <AdminAuditLogsView />,
    'admin-analytics': <AdminAnalyticsView />,
    'admin-system': <AdminSystemView />,
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="h-full w-full overflow-hidden bg-black"
      >
        {views[currentView] ?? <LandingView />}
      </motion.div>
    </AnimatePresence>
  )
}

export default function Home() {
  const { setUser, navigate, user, currentView } = useAppStore()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    getAuthUser()
      .then((u) => {
        setUser(u)
        if (u.role === 'ADMIN') {
          navigate('admin-dashboard')
        } else {
          navigate('feed')
        }
      })
      .catch(() => {
        setUser(null)
        navigate('feed')
      })

    const handlePopState = () => {
      useAppStore.getState().goBack()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Strict Admin Isolation: Admins only access the Admin Control Center
  useEffect(() => {
    if (user?.role === 'ADMIN' && !currentView.startsWith('admin-') && !AUTH_VIEWS.has(currentView)) {
      navigate('admin-dashboard')
    }
  }, [user, currentView, navigate])

  const isAdmin = user?.role === 'ADMIN'
  const showSidebar = !isAdmin && !AUTH_VIEWS.has(currentView) && !DASHBOARD_VIEWS.has(currentView)
  const showTabBar = !isAdmin && user && !AUTH_VIEWS.has(currentView) && !DASHBOARD_VIEWS.has(currentView)
  const showCommentPanel = !isAdmin && !DASHBOARD_VIEWS.has(currentView) && !AUTH_VIEWS.has(currentView)

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-dvh w-screen overflow-hidden bg-black text-white flex">
        {/* Desktop Left Sidebar (Consumer/Creator only) */}
        {showSidebar && <DesktopSidebar />}

        {/* Main Content Area */}
        <main
          className={`h-full flex-1 overflow-hidden bg-black ${
            showSidebar ? 'md:pl-60 lg:pl-64' : ''
          }`}
        >
          <ViewRouter />
        </main>

        {/* Mobile Bottom Tab Bar (Consumer/Creator only) */}
        {showTabBar && <BottomTabBar />}

        {/* Slide-in Comment Drawer */}
        {showCommentPanel && <CommentPanel />}

        <Toaster richColors theme="dark" />
      </div>
    </QueryClientProvider>
  )
}
