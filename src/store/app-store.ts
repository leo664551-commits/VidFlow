'use client'

import { create } from 'zustand'
import type { AppView, AuthUser } from '@/types'

interface AppState {
  currentView: AppView
  user: AuthUser | null
  selectedVideoId: string | null
  searchQuery: string
  navigate: (view: AppView, videoId?: string) => void
  setUser: (user: AuthUser | null) => void
  clearUser: () => void
  setSearchQuery: (q: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'landing',
  user: null,
  selectedVideoId: null,
  searchQuery: '',
  navigate: (view, videoId) =>
    set({
      currentView: view,
      selectedVideoId: videoId ?? null,
    }),
  setUser: (user) => set({ user }),
  clearUser: () =>
    set({ user: null, currentView: 'landing', selectedVideoId: null }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}))
