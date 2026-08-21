'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, UserCheck, UserPlus, Users, Sparkles, Loader2 } from 'lucide-react'
import { getCreatorFollowers, getCreatorFollowing, toggleFollowCreator } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import type { FollowUserItem } from '@/types'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/common/user-avatar'

interface FollowListModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string // user or creator ID
  title?: string
  initialTab?: 'followers' | 'following'
}

export function FollowListModal({
  isOpen,
  onClose,
  userId,
  title,
  initialTab = 'followers',
}: FollowListModalProps) {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const { user: currentUser, navigate, setSelectedCreatorId } = useAppStore()
  const queryClient = useQueryClient()

  // Reset tab when modal opens
  const handleOpenTab = (tab: 'followers' | 'following') => {
    setActiveTab(tab)
    setSearchQuery('')
  }

  // Fetch Followers Query
  const {
    data: followersData,
    isLoading: loadingFollowers,
  } = useQuery({
    queryKey: ['creator-followers', userId],
    queryFn: () => getCreatorFollowers(userId),
    enabled: isOpen,
    staleTime: 5000,
  })

  // Fetch Following Query
  const {
    data: followingData,
    isLoading: loadingFollowing,
  } = useQuery({
    queryKey: ['creator-following', userId],
    queryFn: () => getCreatorFollowing(userId),
    enabled: isOpen,
    staleTime: 5000,
  })

  const followersList = followersData?.data || []
  const followingList = followingData?.data || []

  const currentList = activeTab === 'followers' ? followersList : followingList
  const isLoading = activeTab === 'followers' ? loadingFollowers : loadingFollowing

  // Filter list based on search query
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList
    const q = searchQuery.toLowerCase().trim()
    return currentList.filter(
      (item) =>
        item.displayName.toLowerCase().includes(q) ||
        (item.username && item.username.toLowerCase().includes(q))
    )
  }, [currentList, searchQuery])

  // Follow / Unfollow Mutation with instant optimistic updates
  const followMutation = useMutation({
    mutationFn: (targetId: string) => toggleFollowCreator(targetId),
    onSuccess: (res, targetId) => {
      // Invalidate queries so follower/following lists and profile stats refresh instantly
      queryClient.invalidateQueries({ queryKey: ['creator-followers', userId] })
      queryClient.invalidateQueries({ queryKey: ['creator-following', userId] })
      queryClient.invalidateQueries({ queryKey: ['creator-followers', targetId] })
      queryClient.invalidateQueries({ queryKey: ['creator-following', targetId] })
      queryClient.invalidateQueries({ queryKey: ['creator', userId] })
      queryClient.invalidateQueries({ queryKey: ['creator', targetId] })
      queryClient.invalidateQueries({ queryKey: ['user-me'] })
      queryClient.invalidateQueries({ queryKey: ['creator-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
    onError: () => {
      toast.error('Failed to update follow status')
    },
  })

  const handleToggleFollow = (e: React.MouseEvent, item: FollowUserItem) => {
    e.stopPropagation()
    if (!currentUser) {
      toast.error('Please log in to follow creators')
      navigate('login')
      onClose()
      return
    }
    followMutation.mutate(item.id)
  }

  const handleUserClick = (item: FollowUserItem) => {
    onClose()
    if (item.creatorProfileId || item.role === 'CREATOR') {
      setSelectedCreatorId(item.creatorProfileId || item.id)
      navigate('creator-profile')
    } else if (currentUser && item.id === currentUser.id) {
      navigate('profile')
    } else {
      setSelectedCreatorId(item.id)
      navigate('creator-profile')
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[82vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Title & Close */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="min-w-0 pr-2">
              <h2 className="text-base font-bold text-white truncate">
                {title || (activeTab === 'followers' ? 'Followers' : 'Following')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Followers / Following Segmented Tabs */}
          <div className="flex items-center border-b border-white/10 bg-white/[0.02]">
            <button
              onClick={() => handleOpenTab('followers')}
              className={`flex-1 py-3 text-center text-sm font-bold transition-all relative ${
                activeTab === 'followers'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Followers ({followersList.length})
              {activeTab === 'followers' && (
                <motion.div
                  layoutId="followTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FE2C55]"
                />
              )}
            </button>
            <button
              onClick={() => handleOpenTab('following')}
              className={`flex-1 py-3 text-center text-sm font-bold transition-all relative ${
                activeTab === 'following'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Following ({followingList.length})
              {activeTab === 'following' && (
                <motion.div
                  layoutId="followTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FE2C55]"
                />
              )}
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="p-3 border-b border-white/10 bg-zinc-900/40">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 focus-within:border-[#FE2C55]/60 transition-colors">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* User List Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-700">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-[#FE2C55]" />
                <span className="text-xs">Loading list...</span>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 text-gray-500">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-white">
                  {searchQuery ? 'No results found' : `No ${activeTab} yet`}
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
                  {searchQuery
                    ? `No users matched "${searchQuery}"`
                    : activeTab === 'followers'
                    ? 'When people follow this profile, they will appear here.'
                    : 'Profiles followed will be listed here.'}
                </p>
              </div>
            ) : (
              filteredList.map((item) => {
                const initial = item.displayName?.[0]?.toUpperCase() || 'U'
                return (
                  <div
                    key={item.id}
                    onClick={() => handleUserClick(item)}
                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group"
                  >
                    {/* User Avatar + Name + Handle */}
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <UserAvatar
                        src={item.avatarUrl}
                        name={item.displayName}
                        size="md"
                        bordered
                        role={item.role}
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-white truncate group-hover:text-[#FE2C55] transition-colors">
                            {item.displayName}
                          </p>
                          {item.role === 'CREATOR' && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FE2C55]/20 text-[#FE2C55] uppercase">
                              Creator
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 font-mono truncate">
                          @{item.username || item.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '')}
                        </p>
                        {item.bio && (
                          <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                            {item.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Follow Action Button */}
                    <div className="shrink-0">
                      {item.isSelf ? (
                        <span className="text-[11px] font-bold text-gray-500 px-3 py-1 bg-white/5 rounded-xl">
                          You
                        </span>
                      ) : item.isFollowing ? (
                        <button
                          onClick={(e) => handleToggleFollow(e, item)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-red-500/15 border border-white/20 hover:border-red-500/50 text-white hover:text-red-400 transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-[#25F4EE]" />
                          Following
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleToggleFollow(e, item)}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white transition-all flex items-center gap-1.5 shadow-md shadow-[#FE2C55]/20 hover:scale-105 active:scale-95"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Follow
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
