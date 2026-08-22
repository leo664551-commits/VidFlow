'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Star,
  CheckCheck,
  Video,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { UserAvatar } from '@/components/common/user-avatar'
import { formatDistanceToNow } from 'date-fns'
import type { NotificationItem } from '@/types'

function getNotificationIcon(type: string) {
  switch (type) {
    case 'LIKE_VIDEO':
    case 'LIKE_COMMENT':
      return <Heart className="h-3.5 w-3.5 fill-[#DF4D50] text-[#DF4D50]" />
    case 'COMMENT_REPLY':
    case 'VIDEO_COMMENT':
      return <MessageCircle className="h-3.5 w-3.5 text-[#24BBA9] fill-[#24BBA9]/20" />
    case 'FOLLOW':
      return <UserPlus className="h-3.5 w-3.5 text-[#48B321]" />
    case 'CREATOR_RATING':
      return <Star className="h-3.5 w-3.5 text-[#FF8D28] fill-[#FF8D28]" />
    case 'NEW_VIDEO':
      return <Video className="h-3.5 w-3.5 text-[#5E70FF]" />
    case 'CREATOR_APPLICATION_APPROVED':
      return <Sparkles className="h-3.5 w-3.5 text-[#48B321]" />
    case 'CREATOR_APPLICATION_REJECTED':
      return <Sparkles className="h-3.5 w-3.5 text-[#FF8D28]" />
    default:
      return <Sparkles className="h-3.5 w-3.5 text-gray-400" />
  }
}

export function NotificationsView() {
  const { user, navigate, setSelectedVideoId, setSelectedCreatorId } = useAppStore()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => getNotifications({ page: 1, limit: 40 }),
    enabled: !!user,
  })

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
    },
  })

  const markOneMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
    },
  })

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.read) {
      markOneMutation.mutate(item.id)
    }

    if (item.type === 'CREATOR_APPLICATION_APPROVED') {
      navigate('creator-dashboard')
    } else if (item.type === 'CREATOR_APPLICATION_REJECTED') {
      navigate('profile')
    } else if (item.entityType === 'Video' && item.entityId) {
      navigate('video-detail', item.entityId)
    } else if (item.entityType === 'CreatorProfile' && item.entityId) {
      setSelectedCreatorId(item.entityId)
      navigate('creator-profile')
    } else if (item.entityType === 'Comment' && item.entityId) {
      // Navigate to video context if available
    } else if (item.type === 'FOLLOW' && item.actor?.id) {
      setSelectedCreatorId(item.actor.id)
      navigate('creator-profile')
    }
  }

  // If user is logged out
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-sm px-4 py-4 border-b border-white/10">
          <h1 className="text-white text-lg font-bold">Notifications</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Bell className="h-8 w-8 text-gray-500" />
          </div>
          <h2 className="text-base font-semibold text-white mb-1">Notifications</h2>
          <p className="text-gray-400 text-sm max-w-xs mb-6">
            Log in to see likes, comments, mentions, and updates from creators you follow.
          </p>
          <button
            onClick={() => navigate('login')}
            className="px-6 py-2.5 rounded-full bg-[#5E70FF] hover:bg-[#4D5FE8] text-white font-semibold text-sm transition-all shadow-lg shadow-[#5E70FF]/20"
          >
            Log in
          </button>
        </div>
      </div>
    )
  }

  const notifications = data?.data || []
  const unreadCount = data?.unreadCount || 0

  return (
    <div className="h-full w-full overflow-y-auto bg-black text-white pb-32 select-none scrollbar-thin scrollbar-thumb-zinc-800 scroll-smooth">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-md px-4 py-3.5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-white text-lg font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-[#5E70FF] text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
            title="Mark all as read"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark read</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#5E70FF]" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Bell className="h-8 w-8 text-gray-500" />
          </div>
          <p className="text-base font-semibold text-white">No notifications yet</p>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">
            When someone likes your comments, replies to you, or follows your account, you&apos;ll see it here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 px-2">
          {notifications.map((n, i) => {
            const timeAgo = (() => {
              try {
                return formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
              } catch {
                return 'recently'
              }
            })()

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => handleNotificationClick(n)}
                className={`flex items-start gap-3.5 p-3.5 rounded-xl cursor-pointer transition-all ${
                  n.read ? 'hover:bg-white/5' : 'bg-white/[0.04] hover:bg-white/[0.08]'
                }`}
              >
                {/* Actor Avatar with event badge */}
                <div className="relative shrink-0 mt-0.5">
                  <UserAvatar
                    src={n.actor?.avatarUrl || null}
                    name={n.actor?.displayName || n.actor?.username || 'User'}
                    size="md"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center shadow">
                    {getNotificationIcon(n.type)}
                  </div>
                </div>

                {/* Message Body */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 leading-snug break-words">
                    <span className="font-semibold text-white mr-1">
                      {n.actor?.displayName || (n.actor?.username ? `@${n.actor.username}` : 'VidFlow')}
                    </span>
                    {n.message.replace(
                      new RegExp(`^${n.actor?.displayName || n.actor?.username || ''}\\s*`, 'i'),
                      ''
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{timeAgo}</p>
                </div>

                {/* Unread indicator */}
                {!n.read && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#5E70FF] shrink-0 mt-2 self-center" />
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
