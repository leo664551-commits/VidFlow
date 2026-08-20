'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Heart, ChevronDown, Send, Pin, Bookmark } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getVideoComments,
  createComment,
  getCommentReplies,
  toggleCommentLike,
  pinComment,
} from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import type { CommentWithUser } from '@/types'

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}mo`
}

function CommentAvatar({ userId, displayName, size = 'sm' }: { userId: string; displayName: string; size?: 'sm' | 'xs' }) {
  const bgColors = [
    'bg-pink-600',
    'bg-violet-600',
    'bg-cyan-600',
    'bg-emerald-600',
    'bg-orange-600',
    'bg-rose-600',
  ]
  const colorIndex =
    userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % bgColors.length
  const initial = displayName?.[0]?.toUpperCase() || '?'
  const sizeClass = size === 'xs' ? 'h-6 w-6 text-[10px]' : 'h-9 w-9 text-sm'

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full ${bgColors[colorIndex]} ${sizeClass} font-bold text-white`}
    >
      {initial}
    </div>
  )
}

function ReplyItem({
  reply,
  user,
  onReply,
  onLike,
}: {
  reply: CommentWithUser
  user: { id: string; role: string } | null
  onReply?: (username: string, commentId: string) => void
  onLike?: (commentId: string) => void
}) {
  const canLike = user?.role === 'CONSUMER' || user?.role === 'CREATOR' || user?.role === 'ADMIN'
  const [liked, setLiked] = useState(reply.userLiked)
  const [likeCount, setLikeCount] = useState(reply.likeCount)

  const handleLike = () => {
    if (!canLike) return
    setLiked(!liked)
    setLikeCount(liked ? likeCount - 1 : likeCount + 1)
    onLike?.(reply.id)
  }

  return (
    <div className="flex gap-2.5 px-4 py-2.5">
      <CommentAvatar userId={reply.user.id} displayName={reply.user.displayName} size="xs" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-white">
            {reply.user.displayName}
          </span>
          <span className="text-[11px] text-gray-500">{timeAgo(reply.createdAt)}</span>
        </div>
        <p className="mt-0.5 text-xs text-gray-200 leading-relaxed">{reply.content}</p>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-500">
          <button
            onClick={handleLike}
            className={`flex items-center gap-0.5 transition-colors ${liked ? 'text-red-400' : 'hover:text-gray-300'}`}
          >
            <Heart
              className={`h-3 w-3 ${liked ? 'fill-red-400 text-red-400' : ''}`}
            />
            {likeCount > 0 && likeCount}
          </button>
          {onReply && (
            <button onClick={() => onReply(reply.user.displayName, reply.id)} className="hover:text-gray-300">
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CommentItem({
  comment,
  user,
  onReply,
  onLike,
  isPinned,
  isVideoCreator,
  onPin,
}: {
  comment: CommentWithUser
  user: { id: string; role: string } | null
  onReply?: (username: string, commentId: string) => void
  onLike?: (commentId: string) => void
  isPinned?: boolean
  isVideoCreator?: boolean
  onPin?: (commentId: string | null) => void
}) {
  const [showReplies, setShowReplies] = useState(false)
  const [replies, setReplies] = useState<CommentWithUser[]>([])
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [liked, setLiked] = useState(comment.userLiked)
  const [likeCount, setLikeCount] = useState(comment.likeCount)

  const canLike = user?.role === 'CONSUMER' || user?.role === 'CREATOR' || user?.role === 'ADMIN'
  const canPin = user?.role === 'CREATOR' || user?.role === 'ADMIN'

  const loadReplies = async () => {
    if (loadingReplies) return
    setLoadingReplies(true)
    try {
      const res = await getCommentReplies(comment.id, { limit: 20 })
      setReplies(res.data)
      setShowReplies(true)
    } finally {
      setLoadingReplies(false)
    }
  }

  const handleLike = () => {
    if (!canLike) return
    setLiked(!liked)
    setLikeCount(liked ? likeCount - 1 : likeCount + 1)
    onLike?.(comment.id)
  }

  const handlePin = () => {
    if (!canPin) return
    const newPinned = isPinned ? null : comment.id
    onPin?.(newPinned)
  }

  return (
    <div>
      <div className="flex gap-3 px-4 py-3">
        <CommentAvatar userId={comment.user.id} displayName={comment.user.displayName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              {comment.user.displayName}
            </span>
            <span className="text-xs text-gray-500">{timeAgo(comment.createdAt)}</span>
            {isPinned && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium text-gray-400">
                <Pin className="h-2.5 w-2.5" />
                Pinned
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-200 leading-relaxed">
            {comment.content}
          </p>
          <div className="mt-1.5 flex items-center gap-4 text-xs text-gray-500">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 transition-colors ${liked ? 'text-red-400' : 'hover:text-gray-300'}`}
            >
              <Heart
                className={`h-4 w-4 ${liked ? 'fill-red-400 text-red-400' : ''}`}
              />
              {likeCount > 0 && likeCount}
            </button>
            {comment.replyCount > 0 && (
              <button
                onClick={() =>
                  showReplies ? setShowReplies(false) : loadReplies()
                }
                className="flex items-center gap-0.5 hover:text-gray-300"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${showReplies ? 'rotate-180' : ''}`}
                />
                View {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
            {onReply && (
              <button
                onClick={() => onReply(comment.user.displayName, comment.id)}
                className="hover:text-gray-300"
              >
                Reply
              </button>
            )}
            {canPin && isVideoCreator && (
              <button
                onClick={handlePin}
                className={`flex items-center gap-0.5 transition-colors ${isPinned ? 'text-amber-400' : 'hover:text-gray-300'}`}
              >
                <Pin className={`h-3 w-3 ${isPinned ? 'fill-amber-400' : ''}`} />
                {isPinned ? 'Unpin' : 'Pin'}
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showReplies && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="ml-12 border-l border-white/10">
              {replies.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  user={user}
                  onReply={onReply}
                  onLike={onLike}
                />
              ))}
              {loadingReplies && (
                <div className="flex items-center justify-center py-3">
                  <div className="h-5 w-5 animate-spin rounded-full border border-white/20 border-t-white" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function CommentPanel() {
  const {
    commentPanelOpen,
    setCommentPanelOpen,
    selectedVideoId,
    user,
  } = useAppStore()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyCommentId, setReplyCommentId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['comments', selectedVideoId],
    queryFn: () => getVideoComments(selectedVideoId!, { limit: 50 }),
    enabled: commentPanelOpen && !!selectedVideoId,
  })

  const createMutation = useMutation({
    mutationFn: (params: { content: string; parentCommentId?: string }) =>
      createComment(selectedVideoId!, params),
    onSuccess: () => {
      setText('')
      setReplyTo(null)
      setReplyCommentId(null)
      queryClient.invalidateQueries({ queryKey: ['comments', selectedVideoId] })
    },
  })

  const commentLikeMutation = useMutation({
    mutationFn: (commentId: string) => toggleCommentLike(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', selectedVideoId] })
    },
  })

  const pinMutation = useMutation({
    mutationFn: (commentId: string | null) =>
      pinComment(selectedVideoId!, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', selectedVideoId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  // Any authenticated user can now comment (CONSUMER, CREATOR, ADMIN)
  const canComment = !!user

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || !canComment) return
    const content = replyTo ? `@${replyTo} ${trimmed}` : trimmed
    createMutation.mutate({
      content,
      parentCommentId: replyCommentId ?? undefined,
    })
  }

  const handleReply = (username: string, commentId: string) => {
    setReplyTo(username)
    setReplyCommentId(commentId)
    inputRef.current?.focus()
  }

  const handleClose = () => {
    setReplyTo(null)
    setReplyCommentId(null)
    setText('')
    setCommentPanelOpen(false)
  }

  // Extract pinned comment ID and sort comments
  const pinnedCommentId = (data as any)?.pinnedCommentId
  const comments: CommentWithUser[] = data?.data ?? []

  // Check if current user is the creator of this video's creator
  const isVideoCreator =
    user?.role === 'CREATOR' && !!user?.creatorProfile

  return (
    <AnimatePresence>
      {commentPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex w-[380px] max-w-[85vw] flex-col rounded-l-2xl border-l border-white/10 bg-[#1a1a1a]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <button
                onClick={() => setCommentPanelOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <span className="text-base font-semibold text-white">
                {comments.length} Comments
              </span>
              <div className="w-5" />
            </div>

            {/* Comment List */}
            <div
              className="flex-1 overflow-y-auto py-2"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#333 transparent',
              }}
            >
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <MessageCircleIcon className="mb-2 h-10 w-10" />
                  <p className="text-sm">No comments yet</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Be the first to comment!
                  </p>
                </div>
              ) : (
                comments.map((comment: CommentWithUser) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    user={user}
                    onReply={canComment ? handleReply : undefined}
                    onLike={(commentId) => commentLikeMutation.mutate(commentId)}
                    isPinned={comment.id === pinnedCommentId}
                    isVideoCreator={isVideoCreator}
                    onPin={(commentId) => pinMutation.mutate(commentId)}
                  />
                ))
              )}
            </div>

            {/* Input */}
            {canComment ? (
              <div className="border-t border-white/10 px-3 py-3">
                {replyTo && (
                  <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-400">
                    <span>
                      Replying to <span className="text-white font-medium">@{replyTo}</span>
                    </span>
                    <button
                      onClick={() => {
                        setReplyTo(null)
                        setReplyCommentId(null)
                      }}
                      className="ml-auto text-gray-500 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-full bg-[#2a2a2a] px-4 py-2.5">
                  {user && (
                    <CommentAvatar
                      userId={user.id}
                      displayName={user.displayName}
                      size="xs"
                    />
                  )}
                  <input
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder={
                      replyTo
                        ? `Reply to @${replyTo}...`
                        : 'Add a comment...'
                    }
                    className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
                  />
                  {text.trim() && (
                    <button
                      onClick={handleSubmit}
                      className="flex-shrink-0 text-white hover:text-pink-400 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function MessageCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}