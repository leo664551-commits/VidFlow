'use client'

import { useAppStore } from '@/store/app-store'
import { ConsumerProfileView } from './profile/consumer-profile-view'
import { CreatorOwnProfileView } from './profile/creator-own-profile-view'
import { AdminDashboardView } from './admin-dashboard-view'
import { User, LogIn, UserPlus } from 'lucide-react'

export function ProfileView() {
  const { user, navigate } = useAppStore()

  // Unauthenticated guest prompt
  if (!user) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6 border border-white/15 shadow-xl">
          <User className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Sign in to your profile</h2>
        <p className="text-sm text-gray-400 max-w-sm mb-8 leading-relaxed">
          Log in to check your liked videos, view your ratings, manage your account, or apply to become a creator.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate('login')}
            className="w-full py-3.5 rounded-xl bg-[#5E70FF] hover:bg-[#4D5FE8] text-white font-bold text-sm shadow-lg shadow-[#5E70FF]/25 flex items-center justify-center gap-2 transition-all"
          >
            <LogIn className="w-4 h-4" />
            Log In
          </button>
          <button
            onClick={() => navigate('register')}
            className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/15 flex items-center justify-center gap-2 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Sign Up
          </button>
        </div>
      </div>
    )
  }

  // Explicit, decoupled role-specific profile routing
  if (user.role === 'ADMIN') {
    return <AdminDashboardView />
  }

  if (user.role === 'CREATOR') {
    return <CreatorOwnProfileView />
  }

  return <ConsumerProfileView />
}