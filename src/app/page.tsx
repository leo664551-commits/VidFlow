'use client'

import { useEffect, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from '@/components/ui/sonner'
import { BottomTabBar } from '@/components/layout/bottom-tab-bar'
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
import { AdminCreatorsView } from '@/components/views/admin-creators-view'
import { AdminCreatorNewView } from '@/components/views/admin-creator-new-view'
import { AdminUsersView } from '@/components/views/admin-users-view'
import { AdminVideosView } from '@/components/views/admin-videos-view'
import { AdminCommentsView } from '@/components/views/admin-comments-view'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000, retry: 1 },
  },
})

const AUTH_VIEWS = new Set(['landing', 'login', 'register'])
const DASHBOARD_VIEWS = new Set([
  'creator-dashboard', 'creator-videos', 'creator-upload', 'creator-edit-video',
  'admin-dashboard', 'admin-creators', 'admin-creator-new',
  'admin-users', 'admin-videos', 'admin-comments',
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
    'admin-creators': <AdminCreatorsView />,
    'admin-creator-new': <AdminCreatorNewView />,
    'admin-users': <AdminUsersView />,
    'admin-videos': <AdminVideosView />,
    'admin-comments': <AdminCommentsView />,
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={DASHBOARD_VIEWS.has(currentView) ? 'h-full' : ''}
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
        navigate('feed')
      })
      .catch(() => {
        setUser(null)
        navigate('landing')
      })
  }, [])

  const showTabBar = user && !AUTH_VIEWS.has(currentView) && !DASHBOARD_VIEWS.has(currentView)
  const showCommentPanel = !DASHBOARD_VIEWS.has(currentView) && !AUTH_VIEWS.has(currentView)

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-dvh w-screen overflow-hidden bg-black text-white">
        <main className={DASHBOARD_VIEWS.has(currentView) ? 'h-full overflow-y-auto' : 'h-full'}>
          <ViewRouter />
        </main>
        {showTabBar && <BottomTabBar />}
        {showCommentPanel && <CommentPanel />}
        <Toaster richColors theme="dark" />
      </div>
    </QueryClientProvider>
  )
}
