'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Heart, ChevronDown, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getVideoComments, createComment, getCommentReplies } from '@/lib/api'
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

function CommentItem({
  comment,
  onReply,
}: {
  comment: CommentWithUser
  onReply?: (username: string) => void
}) {
  const [showReplies, setShowReplies] = useState(false)
  const [replies, setReplies] = useState<CommentWithUser[]>([])
  const [loadingReplies, setLoadingReplies] = useState(false)

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

  const initial = comment.user.displayName?.[0]?.toUpperCase() || '?'
  const bgColors = ['bg-pink-600', 'bg-violet-600', 'bg-cyan-600', 'bg-emerald-600', 'bg-orange-600', 'bg-rose-600']
  const colorIndex = comment.user.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % bgColors.length

  return (
    <div>
      <div className="flex gap-3 px-4 py-3">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${bgColors[colorIndex]} text-sm font-bold text-white`}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-white">{comment.user.displayName}</span>
            <span className="text-xs text-gray-500">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="mt-0.5 text-sm text-gray-200 leading-relaxed">{comment.content}</p>
          <div className="mt-1.5 flex items-center gap-4 text-xs text-gray-500">
            {comment.replyCount > 0 && (
              <button
                onClick={() => (showReplies ? setShowReplies(false) : loadReplies())}
                className="flex items-center gap-0.5 hover:text-gray-300"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showReplies ? 'rotate-180' : ''}`} />
                View {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
            {onReply && (
              <button onClick={() => onReply(comment.user.displayName)} className="hover:text-gray-300">
                Reply
              </button>
            )}
          </div>
        </div>
        <button className="flex-shrink-0 self-center">
          <Heart className="h-4 w-4 text-gray-500" />
        </button>
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
                <CommentItem key={reply.id} comment={reply} />
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
  const { commentPanelOpen, setCommentPanelOpen, selectedVideoId, user } = useAppStore()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['comments', selectedVideoId],
    queryFn: () => getVideoComments(selectedVideoId!, { limit: 50 }),
    enabled: commentPanelOpen && !!selectedVideoId,
  })

  const createMutation = useMutation({
    mutationFn: (content: string) =>
      createComment(selectedVideoId!, { content, parentCommentId: undefined }),
    onSuccess: () => {
      setText('')
      setReplyTo(null)
      queryClient.invalidateQueries({ queryKey: ['comments', selectedVideoId] })
    },
  })

  const canComment = user?.role === 'CONSUMER' || user?.role === 'ADMIN'

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || !canComment) return
    createMutation.mutate(replyTo ? `@${replyTo} ${trimmed}` : trimmed)
  }

  const handleReply = (username: string) => {
    setReplyTo(username)
    inputRef.current?.focus()
  }

  const handleClose = () => {
    setReplyTo(null)
    setText('')
    setCommentPanelOpen(false)
  }

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
              <button onClick={() => setCommentPanelOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
              <span className="text-base font-semibold text-white">Comments</span>
              <div className="w-5" />
            </div>

            {/* Comment List */}
            <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                </div>
              ) : data?.data?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <MessageCircleIcon className="mb-2 h-10 w-10" />
                  <p className="text-sm">No comments yet</p>
                </div>
              ) : (
                data?.data?.map((comment: CommentWithUser) => (
                  <CommentItem key={comment.id} comment={comment} onReply={canComment ? handleReply : undefined} />
                ))
              )}
            </div>

            {/* Input */}
            {canComment ? (
              <div className="border-t border-white/10 px-3 py-3">
                <div className="flex items-center gap-2 rounded-full bg-[#2a2a2a] px-4 py-2.5">
                  {user && (
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-xs font-bold text-white">
                      {user.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <input
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder={replyTo ? `Reply to @${replyTo}...` : 'Add a comment...'}
                    className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
                  />
                  {text.trim() && (
                    <button onClick={handleSubmit} className="flex-shrink-0 text-white hover:text-pink-400">
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}