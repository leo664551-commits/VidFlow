'use client'

import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Heart, ChevronDown, Send, Pin, Smile } from 'lucide-react'
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
import { toast } from 'sonner'
import { UserAvatar } from '@/components/common/user-avatar'

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

function CommentAvatar({
  displayName,
  avatarUrl,
  size = 'md',
}: {
  userId?: string
  displayName: string
  avatarUrl?: string | null
  size?: 'md' | 'sm' | 'xs'
}) {
  return (
    <UserAvatar
      src={avatarUrl}
      name={displayName}
      size={size}
    />
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
  const canLike = !!user
  const [liked, setLiked] = useState(reply.userLiked)
  const [likeCount, setLikeCount] = useState(reply.likeCount)

  const handleLike = () => {
    if (!canLike) {
      toast.error('Please log in to like comments')
      return
    }
    setLiked(!liked)
    setLikeCount(liked ? likeCount - 1 : likeCount + 1)
    onLike?.(reply.id)
  }

  return (
    <div className="flex items-start gap-3 py-2 pl-2 group">
      <CommentAvatar
        userId={reply.user.id}
        displayName={reply.user.displayName}
        avatarUrl={reply.user.avatarUrl}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">
            {reply.user.displayName}
          </span>
          <span className="text-[11px] text-gray-500">{timeAgo(reply.createdAt)}</span>
        </div>
        <p className="mt-0.5 text-xs text-gray-200 leading-relaxed break-words">{reply.content}</p>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-400">
          {likeCount > 0 && <span>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>}
          {onReply && (
            <button
              onClick={() => onReply(reply.user.displayName, reply.id)}
              className="font-medium hover:text-white transition-colors"
            >
              Reply
            </button>
          )}
        </div>
      </div>
      <button
        onClick={handleLike}
        className="p-1 text-gray-400 hover:text-red-400 transition-colors ml-1"
      >
        <Heart
          className={`h-3.5 w-3.5 ${liked ? 'fill-red-500 text-red-500' : ''}`}
        />
      </button>
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

  const canLike = !!user
  // Only the creator who owns the video or an admin can pin/unpin comments
  const canPin = isVideoCreator || user?.role === 'ADMIN'

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
    if (!canLike) {
      toast.error('Please log in to like comments')
      return
    }
    setLiked(!liked)
    setLikeCount(liked ? likeCount - 1 : likeCount + 1)
    onLike?.(comment.id)
  }

  const handlePin = () => {
    if (!canPin) {
      toast.error('Only the video owner can pin comments')
      return
    }
    const newPinned = isPinned ? null : comment.id
    onPin?.(newPinned)
  }

  return (
    <div className="py-2.5 group">
      <div className="flex items-start gap-3">
        <CommentAvatar
          userId={comment.user.id}
          displayName={comment.user.displayName}
          avatarUrl={comment.user.avatarUrl}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white">
              {comment.user.displayName}
            </span>
            <span className="text-[11px] text-gray-500">{timeAgo(comment.createdAt)}</span>
            {isPinned && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                <Pin className="h-2.5 w-2.5" />
                Pinned
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-200 leading-relaxed break-words">
            {comment.content}
          </p>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400 font-medium">
            {likeCount > 0 && <span>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>}
            {onReply && (
              <button
                onClick={() => onReply(comment.user.displayName, comment.id)}
                className="hover:text-white transition-colors"
              >
                Reply
              </button>
            )}
            {canPin && (
              <button
                onClick={handlePin}
                className={`flex items-center gap-0.5 transition-colors ${
                  isPinned ? 'text-amber-400 font-bold' : 'hover:text-gray-300'
                }`}
              >
                <Pin className={`h-3 w-3 ${isPinned ? 'fill-amber-400' : ''}`} />
                {isPinned ? 'Unpin' : 'Pin'}
              </button>
            )}
          </div>

          {/* View replies toggle (Instagram/TikTok style line + count) */}
          {comment.replyCount > 0 && (
            <div className="mt-2">
              <button
                onClick={() => (showReplies ? setShowReplies(false) : loadReplies())}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 font-semibold transition-colors"
              >
                <span className="inline-block w-6 h-[1px] bg-gray-600" />
                <span>
                  {showReplies
                    ? 'Hide replies'
                    : `View all ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
                </span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${showReplies ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Heart Like button aligned on the far right */}
        <button
          onClick={handleLike}
          className="p-1 text-gray-400 hover:text-red-400 transition-colors ml-1 mt-0.5"
        >
          <Heart
            className={`h-4 w-4 ${liked ? 'fill-red-500 text-red-500' : ''}`}
          />
        </button>
      </div>

      {/* Nested Replies List */}
      <AnimatePresence>
        {showReplies && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="ml-10 mt-1 pl-2 border-l border-white/10 space-y-1">
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
                <div className="flex items-center justify-center py-2">
                  <div className="h-4 w-4 animate-spin rounded-full border border-white/20 border-t-[#FE2C55]" />
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
    queryKey: ['comments', selectedVideoId, user?.id],
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

  const canComment = !!user

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (!canComment) {
      toast.error('Please log in to post a comment')
      return
    }
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

  // Extract pinned comment ID and sort comments so pinned comment is ALWAYS at the very top
  const pinnedCommentId = (data as any)?.pinnedCommentId
  const rawComments: CommentWithUser[] = data?.data ?? []

  const comments = useMemo(() => {
    if (!rawComments.length) return []
    if (!pinnedCommentId) return rawComments
    const pinned = rawComments.find((c) => c.id === pinnedCommentId)
    if (!pinned) return rawComments
    const rest = rawComments.filter((c) => c.id !== pinnedCommentId)
    return [pinned, ...rest]
  }, [rawComments, pinnedCommentId])

  // Only the creator who owns the video (or an admin) is considered the video creator for pin actions
  const videoCreatorId = (data as any)?.creatorId
  const isVideoCreator = (!!user?.id && user.id === videoCreatorId) || user?.role === 'ADMIN'

  return (
    <AnimatePresence>
      {commentPanelOpen && (
        <>
          {/* Subtle non-blocking overlay on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            onClick={handleClose}
          />

          {/* Floating Card Container (Picture 1 style on Desktop, Bottom Sheet on Mobile) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed bottom-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 right-0 md:right-10 lg:right-20 z-50 flex w-full md:w-[380px] lg:w-[410px] h-[75vh] md:h-[580px] md:max-h-[85vh] flex-col rounded-t-3xl md:rounded-3xl border border-white/15 bg-[#141416]/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3.5 bg-white/[0.02]">
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-sm font-bold text-white text-center flex-1 pr-8">
                Comments
              </h3>
            </div>

            {/* Comment List */}
            <div
              className="flex-1 overflow-y-auto px-4 py-2 space-y-1 divide-y divide-white/5 scrollbar-thin scrollbar-thumb-zinc-700"
            >
              {isLoading ? (
                <div className="flex h-full items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FE2C55]/20 border-t-[#FE2C55]" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <Heart className="w-6 h-6 text-gray-500" />
                  </div>
                  <p className="text-sm font-bold text-white">No comments yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Start the conversation. Be the first to leave a comment!
                  </p>
                </div>
              ) : (
                comments.map((comment: CommentWithUser) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    user={user}
                    onReply={handleReply}
                    onLike={(commentId) => commentLikeMutation.mutate(commentId)}
                    isPinned={comment.id === pinnedCommentId}
                    isVideoCreator={isVideoCreator}
                    onPin={(commentId) => pinMutation.mutate(commentId)}
                  />
                ))
              )}
            </div>

            {/* Input Bar at Bottom */}
            <div className="border-t border-white/10 px-4 py-3 bg-zinc-950/80">
              {replyTo && (
                <div className="mb-2 flex items-center justify-between text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg">
                  <span>
                    Replying to <span className="text-[#FE2C55] font-semibold">@{replyTo}</span>
                  </span>
                  <button
                    onClick={() => {
                      setReplyTo(null)
                      setReplyCommentId(null)
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                {user ? (
                  <CommentAvatar
                    userId={user.id}
                    displayName={user.displayName}
                    avatarUrl={user.avatarUrl}
                    size="sm"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-gray-400">
                    ?
                  </div>
                )}

                <div className="flex-1 flex items-center gap-2 bg-zinc-800/90 hover:bg-zinc-800 focus-within:bg-zinc-800 border border-white/10 rounded-full px-3.5 py-1.5 transition-all">
                  <input
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      // Prevent video pause/play and scroll events while typing
                      e.stopPropagation()
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSubmit()
                      }
                    }}
                    onKeyUp={(e) => e.stopPropagation()}
                    onKeyPress={(e) => e.stopPropagation()}
                    placeholder={
                      !canComment
                        ? 'Log in to add a comment...'
                        : replyTo
                        ? `Reply to @${replyTo}...`
                        : 'Add a comment...'
                    }
                    className="min-w-0 flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-gray-400 outline-none"
                  />

                  {text.trim() ? (
                    <button
                      onClick={handleSubmit}
                      className="text-[#FE2C55] hover:text-[#FE2C55]/80 font-bold text-xs transition-colors p-1"
                    >
                      Post
                    </button>
                  ) : (
                    <span className="text-gray-400 cursor-pointer p-0.5">
                      <Smile className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
