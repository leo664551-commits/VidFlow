'use client'

import { create } from 'zustand'
import type { AppView, AuthUser } from '@/types'

export interface VideoContext {
  source: 'feed' | 'discover' | 'creator-profile' | 'liked-videos' | 'creator-videos' | 'other'
  videoIds: string[]
}

export interface HistoryEntry {
  view: AppView
  videoId?: string | null
  creatorId?: string | null
  videoContext?: VideoContext | null
}

interface AppState {
  currentView: AppView
  history: HistoryEntry[]
  user: AuthUser | null
  selectedVideoId: string | null
  videoContext: VideoContext | null
  searchQuery: string
  commentPanelOpen: boolean
  selectedCreatorId: string | null
  navigate: (view: AppView, videoId?: string, context?: VideoContext) => void
  goBack: (fallbackView?: AppView) => void
  setUser: (user: AuthUser | null) => void
  clearUser: () => void
  setSearchQuery: (q: string) => void
  toggleCommentPanel: () => void
  setCommentPanelOpen: (open: boolean) => void
  setSelectedCreatorId: (id: string | null) => void
  setSelectedVideoId: (id: string | null, context?: VideoContext) => void
  setVideoContext: (context: VideoContext | null) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'landing',
  history: [],
  user: null,
  selectedVideoId: null,
  videoContext: null,
  searchQuery: '',
  commentPanelOpen: false,
  selectedCreatorId: null,
  navigate: (view, videoId, context) =>
    set((state) => {
      // Don't add duplicate if clicking same view without video change
      if (state.currentView === view && state.selectedVideoId === (videoId ?? null)) {
        return context !== undefined ? { videoContext: context } : state
      }

      const prevEntry: HistoryEntry = {
        view: state.currentView,
        videoId: state.selectedVideoId,
        creatorId: state.selectedCreatorId,
        videoContext: state.videoContext,
      }

      return {
        currentView: view,
        history: [...state.history, prevEntry].slice(-30),
        selectedVideoId: videoId ?? null,
        videoContext: context !== undefined ? context : (view === 'video-detail' ? state.videoContext : null),
        commentPanelOpen: false,
      }
    }),
  goBack: (fallbackView = 'feed') =>
    set((state) => {
      if (state.history.length === 0) {
        return {
          currentView: fallbackView,
          selectedVideoId: null,
          videoContext: null,
          commentPanelOpen: false,
        }
      }

      const newHistory = [...state.history]
      const previous = newHistory.pop()!

      return {
        currentView: previous.view,
        history: newHistory,
        selectedVideoId: previous.videoId ?? null,
        selectedCreatorId: previous.creatorId ?? state.selectedCreatorId,
        videoContext: previous.videoContext ?? null,
        commentPanelOpen: false,
      }
    }),
  setUser: (user) => set({ user }),
  clearUser: () =>
    set({
      user: null,
      history: [],
      currentView: 'landing',
      selectedVideoId: null,
      videoContext: null,
      commentPanelOpen: false,
      selectedCreatorId: null,
    }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleCommentPanel: () =>
    set((s) => ({ commentPanelOpen: !s.commentPanelOpen })),
  setCommentPanelOpen: (open) => set({ commentPanelOpen: open }),
  setSelectedCreatorId: (id) => set({ selectedCreatorId: id }),
  setSelectedVideoId: (id, context) =>
    set((state) => ({
      selectedVideoId: id,
      videoContext: context !== undefined ? context : state.videoContext,
    })),
  setVideoContext: (context) => set({ videoContext: context }),
}))
