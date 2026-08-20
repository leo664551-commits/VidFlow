'use client'

import { create } from 'zustand'
import type { AppView, AuthUser } from '@/types'

interface AppState {
  currentView: AppView
  user: AuthUser | null
  selectedVideoId: string | null
  searchQuery: string
  commentPanelOpen: boolean
  selectedCreatorId: string | null
  navigate: (view: AppView, videoId?: string) => void
  setUser: (user: AuthUser | null) => void
  clearUser: () => void
  setSearchQuery: (q: string) => void
  toggleCommentPanel: () => void
  setCommentPanelOpen: (open: boolean) => void
  setSelectedCreatorId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'landing',
  user: null,
  selectedVideoId: null,
  searchQuery: '',
  commentPanelOpen: false,
  selectedCreatorId: null,
  navigate: (view, videoId) =>
    set({
      currentView: view,
      selectedVideoId: videoId ?? null,
      commentPanelOpen: false,
    }),
  setUser: (user) => set({ user }),
  clearUser: () =>
    set({
      user: null,
      currentView: 'landing',
      selectedVideoId: null,
      commentPanelOpen: false,
      selectedCreatorId: null,
    }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleCommentPanel: () =>
    set((s) => ({ commentPanelOpen: !s.commentPanelOpen })),
  setCommentPanelOpen: (open) => set({ commentPanelOpen: open }),
  setSelectedCreatorId: (id) => set({ selectedCreatorId: id }),
}))
