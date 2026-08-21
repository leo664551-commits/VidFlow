'use client'

import { Bell } from 'lucide-react'
import { motion } from 'framer-motion'

const NOTIFICATIONS = [
  { id: '1', text: 'New video from Stellar Studios', time: '2h ago' },
  { id: '2', text: 'Your comment got 5 likes', time: '3h ago' },
  { id: '3', text: 'Welcome to VidFlow!', time: '1d ago' },
]

export function NotificationsView() {
  if (NOTIFICATIONS.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-sm px-4 py-4">
          <h1 className="text-white text-lg font-bold">Inbox</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <Bell className="h-12 w-12 text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">No notifications yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-black text-white pb-32 select-none scrollbar-thin scrollbar-thumb-zinc-800 scroll-smooth">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-sm px-4 py-4">
        <h1 className="text-white text-lg font-bold">Inbox</h1>
      </div>

      {/* List */}
      <div className="px-4 space-y-0.5">
        {NOTIFICATIONS.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            className="flex items-start gap-3 p-3.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="mt-0.5 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Bell className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-200 text-sm leading-snug">{n.text}</p>
              <p className="text-gray-500 text-xs mt-0.5">{n.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
