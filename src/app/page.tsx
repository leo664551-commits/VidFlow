'use client'

import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from '@/components/ui/toaster'
import { AppHeader } from '@/components/layout/app-header'
import { AppFooter } from '@/components/layout/app-footer'
import { useAppStore } from '@/store/app-store'
import { getAuthUser } from '@/lib/api'
import { LandingView } from '@/components/views/landing-view'
import { LoginView } from '@/components/views/login-view'
import { RegisterView } from '@/components/views/register-view'
import { ConsumerHomeView } from '@/components/views/consumer-home-view'
import { SearchView } from '@/components/views/search-view'
import { VideoDetailView } from '@/components/views/video-detail-view'
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
import { ProfileView } from '@/components/views/profile-view'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
})

function ViewRouter() {
  const currentView = useAppStore((s) => s.currentView)

  const views: Record<string, React.ReactNode> = {
    landing: <LandingView />,
    login: <LoginView />,
    register: <RegisterView />,
    'consumer-home': <ConsumerHomeView />,
    search: <SearchView />,
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
    profile: <ProfileView />,
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {views[currentView] ?? <LandingView />}
      </motion.div>
    </AnimatePresence>
  )
}

export default function Home() {
  const { setUser, navigate } = useAppStore()

  useEffect(() => {
    getAuthUser()
      .then((u) => {
        setUser(u)
        const view =
          u.role === 'ADMIN'
            ? 'admin-dashboard'
            : u.role === 'CREATOR'
              ? 'creator-dashboard'
              : 'consumer-home'
        navigate(view)
      })
      .catch(() => {
        setUser(null)
        navigate('landing')
      })
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1">
          <ViewRouter />
        </main>
        <AppFooter />
        <Toaster />
      </div>
    </QueryClientProvider>
  )
}
